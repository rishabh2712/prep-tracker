import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const PAYLOAD_EXCLUDE_KEYS = new Set(["links", "tags", "deletedAt", "createdAt", "updatedAt", "ownerUserId", "isShared"]);

export class DuplicateContentError extends Error {
  constructor(message, existingId, existingDeleted) {
    super(message);
    this.name = "DuplicateContentError";
    this.existingId = existingId;
    this.existingDeleted = existingDeleted;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV !== "production") {
      const localFallbacks = {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SERVICE_ROLE_KEY:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      };
      if (localFallbacks[name]) {
        return localFallbacks[name];
      }
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let sqlSingleton = null;
let supabaseAdminSingleton = null;

export function getSql() {
  if (!sqlSingleton) {
    sqlSingleton = postgres(requireEnv("DATABASE_URL"), {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sqlSingleton;
}

export async function closeSql() {
  if (sqlSingleton) {
    await sqlSingleton.end({ timeout: 5 });
    sqlSingleton = null;
  }
}

export function getSupabaseAdmin() {
  if (!supabaseAdminSingleton) {
    supabaseAdminSingleton = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdminSingleton;
}

export async function findUserByEmail(email) {
  const sql = getSql();
  const rows = await sql`
    select id, email, raw_user_meta_data
    from auth.users
    where lower(email) = lower(${email})
    limit 1
  `;
  return rows[0] ?? null;
}

export async function ensureUserByEmail({ email, password, displayName }) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  if (!password) {
    throw new Error(`User ${email} does not exist yet. Set a password to bootstrap the account.`);
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName ?? email.split("@")[0],
    },
  });

  if (error) {
    throw error;
  }

  const created = await findUserByEmail(email);
  if (!created) {
    throw new Error(`Unable to find bootstrapped user ${email} after creation.`);
  }
  return created;
}

function normalizeText(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\-_.:/ ]/g, "");
}

function canonicalProblemUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.replace(/\/+$/, "");
    return `${host}${pathname}`;
  } catch {
    const normalized = normalizeText(raw);
    return normalized || null;
  }
}

export function normalizeTags(tags) {
  const seen = new Set();
  const out = [];
  for (const tag of Array.isArray(tags) ? tags : []) {
    const value = String(tag ?? "").trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function toCanonicalKey(item) {
  if (item.type === "LEETCODE") {
    const url = canonicalProblemUrl(item.problemLink);
    if (url) return `LEETCODE:url:${url}`;
    const slug = normalizeText(item.problemSlug);
    if (slug) return `LEETCODE:slug:${slug}`;
    const title = normalizeText(item.title);
    if (title) return `LEETCODE:title:${title}`;
    return null;
  }

  if (item.type === "SYSTEM_DESIGN" || item.type === "LLD") {
    const topic = normalizeText(item.systemTopic);
    if (topic) return `${item.type}:topic:${topic}`;
    const title = normalizeText(item.title);
    if (title) return `${item.type}:title:${title}`;
    return null;
  }

  const title = normalizeText(item.title);
  return title ? `${item.type}:title:${title}` : null;
}

function toPayload(input) {
  const payload = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (PAYLOAD_EXCLUDE_KEYS.has(key)) continue;
    payload[key] = value;
  }
  if (!("metadata" in payload) || typeof payload.metadata !== "object" || Array.isArray(payload.metadata) || payload.metadata === null) {
    payload.metadata = {};
  }
  if (!("notesMarkdown" in payload)) {
    payload.notesMarkdown = "";
  }
  return payload;
}

function mapLinks(rows) {
  return rows.map((row) => ({ id: row.id, label: row.label, url: row.url }));
}

function hydrateSharedItem(content, links) {
  const payload = content.payload_json && typeof content.payload_json === "object" ? content.payload_json : {};
  const metadata = payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata) ? payload.metadata : {};
  return {
    ...payload,
    id: content.id,
    ownerUserId: content.owner_user_id,
    isShared: content.is_shared,
    title: content.title,
    type: content.type,
    tags: Array.isArray(content.tags_json) ? content.tags_json : [],
    deletedAt: content.deleted_at,
    links,
    metadata,
    notesMarkdown: typeof payload.notesMarkdown === "string" ? payload.notesMarkdown : "",
    createdAt: content.created_at,
    updatedAt: content.updated_at,
  };
}

async function fetchSharedRows(ids) {
  const sql = getSql();
  if (!ids || ids.length === 0) return [];
  const contents = await sql`
    select *
    from public.content_items
    where id in ${sql(ids)}
      and is_shared = true
    order by created_at asc
  `;
  const links =
    contents.length === 0
      ? []
      : await sql`
          select *
          from public.content_item_links
          where content_item_id in ${sql(contents.map((row) => row.id))}
          order by content_item_id asc, label asc, url asc
        `;

  const linksByItemId = new Map();
  for (const link of links) {
    const current = linksByItemId.get(link.content_item_id) ?? [];
    current.push(link);
    linksByItemId.set(link.content_item_id, current);
  }

  return contents.map((content) => hydrateSharedItem(content, mapLinks(linksByItemId.get(content.id) ?? [])));
}

export async function listSharedContentItems({ type = "ALL", includeDeleted = false } = {}) {
  const sql = getSql();
  const rows =
    type === "ALL"
      ? await sql`
          select *
          from public.content_items
          where is_shared = true
            and (${includeDeleted} = true or deleted_at is null)
          order by created_at asc
        `
      : await sql`
          select *
          from public.content_items
          where is_shared = true
            and type = ${type}
            and (${includeDeleted} = true or deleted_at is null)
          order by created_at asc
        `;
  return fetchSharedRows(rows.map((row) => row.id));
}

export async function getSharedContentItem(id) {
  const rows = await fetchSharedRows([id]);
  return rows[0] ?? null;
}

async function findExistingSharedMatch({ id, canonicalKey, type, title }) {
  const sql = getSql();

  if (id) {
    const exact = await sql`
      select id, deleted_at
      from public.content_items
      where id = ${id}
        and is_shared = true
      limit 1
    `;
    if (exact[0]) return exact[0];
  }

  if (canonicalKey) {
    const byCanonical = await sql`
      select id, deleted_at
      from public.content_items
      where is_shared = true
        and canonical_key = ${canonicalKey}
      limit 1
    `;
    if (byCanonical[0]) return byCanonical[0];
  }

  const byTitle = await sql`
    select id, deleted_at
    from public.content_items
    where is_shared = true
      and type = ${type}
      and lower(title) = lower(${title})
    limit 1
  `;
  return byTitle[0] ?? null;
}

async function replaceLinks(contentItemId, links) {
  const sql = getSql();
  await sql`
    delete from public.content_item_links
    where content_item_id = ${contentItemId}
  `;

  for (const link of Array.isArray(links) ? links : []) {
    if (!link?.url) continue;
    await sql`
      insert into public.content_item_links (id, content_item_id, label, url)
      values (${link.id ?? randomUUID()}, ${contentItemId}, ${String(link.label ?? link.url)}, ${String(link.url)})
    `;
  }
}

export async function createSharedContentItem(input) {
  const sql = getSql();
  const canonicalKey = toCanonicalKey(input);
  const existing = await findExistingSharedMatch({
    id: input.id,
    canonicalKey,
    type: input.type,
    title: input.title,
  });

  if (existing) {
    throw new DuplicateContentError("Shared content item already exists", existing.id, Boolean(existing.deleted_at));
  }

  const now = new Date().toISOString();
  const id = input.id ?? randomUUID();
  const payload = toPayload({ ...input, id });

  await sql`
    insert into public.content_items (
      id,
      owner_user_id,
      is_shared,
      title,
      type,
      tags_json,
      deleted_at,
      canonical_key,
      payload_json,
      created_at,
      updated_at
    )
    values (
      ${id},
      null,
      true,
      ${input.title},
      ${input.type},
      ${normalizeTags(input.tags)},
      ${input.deletedAt ?? null},
      ${canonicalKey},
      ${payload},
      ${input.createdAt ?? now},
      ${input.updatedAt ?? now}
    )
  `;

  await replaceLinks(id, input.links ?? []);
  return getSharedContentItem(id);
}

export async function updateSharedContentItem(id, patch) {
  const sql = getSql();
  const current = await getSharedContentItem(id);
  if (!current) return null;

  const merged = {
    ...current,
    ...patch,
    id,
    links: patch.links ?? current.links,
    tags: patch.tags ? normalizeTags(patch.tags) : current.tags,
    metadata:
      patch.metadata && typeof patch.metadata === "object" && !Array.isArray(patch.metadata)
        ? patch.metadata
        : current.metadata ?? {},
  };
  const payload = toPayload(merged);
  const canonicalKey = toCanonicalKey(merged);

  await sql`
    update public.content_items
    set
      title = ${merged.title},
      type = ${merged.type},
      tags_json = ${normalizeTags(merged.tags)},
      deleted_at = ${patch.deletedAt === undefined ? current.deletedAt ?? null : patch.deletedAt},
      canonical_key = ${canonicalKey},
      payload_json = ${payload},
      updated_at = ${patch.updatedAt ?? new Date().toISOString()}
    where id = ${id}
      and is_shared = true
  `;

  if (patch.links) {
    await replaceLinks(id, patch.links);
  }

  return getSharedContentItem(id);
}

export async function restoreSharedContentItem(id) {
  const sql = getSql();
  await sql`
    update public.content_items
    set deleted_at = null, updated_at = ${new Date().toISOString()}
    where id = ${id}
      and is_shared = true
  `;
  return getSharedContentItem(id);
}

export async function softDeleteSharedContentItem(id) {
  const sql = getSql();
  await sql`
    update public.content_items
    set deleted_at = ${new Date().toISOString()}, updated_at = ${new Date().toISOString()}
    where id = ${id}
      and is_shared = true
  `;
  return getSharedContentItem(id);
}
