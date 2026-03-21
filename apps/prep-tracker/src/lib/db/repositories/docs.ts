import { getSql } from "@/lib/db/sql";
import { getAccessibleItem, updateAccessibleItem } from "@/lib/db/repositories/items";
import { MarkdownConflictError, sha256 } from "@/lib/db/prep-items";
import type { MarkdownSaveInput } from "@/lib/validators";

export type SystemDesignMarkdownDoc = {
  itemId: string;
  path: string;
  content: string;
  checksum: string;
  updatedAt: string;
};

function virtualPath(itemId: string) {
  return `db://system-design/${itemId}.md`;
}

export async function getSystemDesignMarkdownForUser(userId: string, itemId: string): Promise<SystemDesignMarkdownDoc | null> {
  const item = await getAccessibleItem(userId, itemId);
  if (!item || item.deletedAt || item.type !== "SYSTEM_DESIGN") return null;

  const sql = getSql();
  const [row] = await sql<{ content_markdown: string; checksum: string; updated_at: string }[]>`
    select content_markdown, checksum, updated_at
    from public.user_item_docs
    where user_id = ${userId}
      and content_item_id = ${itemId}
    limit 1
  `;

  const content = row?.content_markdown ?? item.notesMarkdown ?? "";
  const checksum = row?.checksum ?? sha256(content);
  const updatedAt = row?.updated_at ?? item.updatedAt;

  return {
    itemId,
    path: virtualPath(itemId),
    content,
    checksum,
    updatedAt,
  };
}

export async function saveSystemDesignMarkdownForUser(userId: string, itemId: string, input: MarkdownSaveInput): Promise<SystemDesignMarkdownDoc | null> {
  const current = await getSystemDesignMarkdownForUser(userId, itemId);
  if (!current) return null;

  if (input.expectedChecksum && input.expectedChecksum !== current.checksum) {
    throw new MarkdownConflictError("Markdown file changed since last load", current);
  }

  const checksum = sha256(input.content);
  const updatedAt = new Date().toISOString();
  const sql = getSql();

  await sql`
    insert into public.user_item_docs (user_id, content_item_id, content_markdown, checksum, updated_at)
    values (${userId}, ${itemId}, ${input.content}, ${checksum}, ${updatedAt})
    on conflict (user_id, content_item_id) do update set
      content_markdown = excluded.content_markdown,
      checksum = excluded.checksum,
      updated_at = excluded.updated_at
  `;

  await updateAccessibleItem(userId, itemId, { notesMarkdown: input.content });

  return {
    itemId,
    path: virtualPath(itemId),
    content: input.content,
    checksum,
    updatedAt,
  };
}
