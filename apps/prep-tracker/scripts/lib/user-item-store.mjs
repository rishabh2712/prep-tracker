import { randomUUID } from "node:crypto";
import { getSql, normalizeTags, toCanonicalKey } from "./shared-content-store.mjs";
import { requireSeedUser } from "./goal-admin-store.mjs";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function dedupeLinks(links) {
  const seen = new Set();
  const out = [];
  for (const link of Array.isArray(links) ? links : []) {
    const url = String(link?.url ?? "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: link?.id ?? randomUUID(),
      label: String(link?.label ?? url),
      url,
    });
  }
  return out;
}

function buildPayload(input, id) {
  return {
    id,
    title: input.title,
    type: input.type,
    notesMarkdown: input.notesMarkdown ?? "",
    tags: normalizeTags(input.tags),
    links: dedupeLinks(input.links),
    platform: input.platform ?? null,
    problemLink: input.problemLink ?? null,
    problemSlug: input.problemSlug ?? null,
    difficulty: input.difficulty ?? null,
    pattern: input.pattern ?? null,
    systemTopic: input.systemTopic ?? null,
    metadata: asObject(input.metadata),
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

function hydrateItem(content, state, links) {
  const payload = asObject(content.payload_json);
  return {
    ...payload,
    id: content.id,
    title: content.title,
    type: content.type,
    tags: Array.isArray(content.tags_json) ? content.tags_json : [],
    links,
    deletedAt: state?.deleted_at ?? content.deleted_at,
    state: state?.state ?? "ACTIVE",
    mastery: state?.mastery ?? "MEDIUM",
    shouldReviewAgain: state?.should_review_again ?? true,
    reviewIntervalDays: state?.review_interval_days ?? 7,
    nextReviewAt: state?.next_review_at ?? null,
    lastReviewedAt: state?.last_reviewed_at ?? null,
    attemptCount: state?.attempt_count ?? null,
    timeSpentMinutes: state?.time_spent_minutes ?? null,
    confidence: state?.confidence ?? null,
    lastAttemptedAt: state?.last_attempted_at ?? null,
    leetcodeOutcome: state?.leetcode_outcome ?? null,
    lastSolvedAt: state?.last_solved_at ?? null,
    solutionSummaryMarkdown: state?.solution_summary_markdown ?? null,
    metadata: {
      ...(asObject(payload.metadata)),
      ...(asObject(state?.metadata_json)),
    },
    ownerUserId: content.owner_user_id,
    isShared: content.is_shared,
    createdAt: content.created_at,
    updatedAt: state?.updated_at ?? content.updated_at,
  };
}

async function getPrivateRecord(userId, candidate) {
  const sql = getSql();
  const canonicalKey = toCanonicalKey(candidate);
  const rows =
    canonicalKey
      ? await sql`
          select *
          from public.content_items
          where owner_user_id = ${userId}
            and canonical_key = ${canonicalKey}
          limit 1
        `
      : await sql`
          select *
          from public.content_items
          where owner_user_id = ${userId}
            and type = ${candidate.type}
            and lower(title) = lower(${candidate.title})
          limit 1
        `;
  return rows[0] ?? null;
}

async function replaceLinks(itemId, links) {
  const sql = getSql();
  await sql`
    delete from public.content_item_links
    where content_item_id = ${itemId}
  `;
  for (const link of dedupeLinks(links)) {
    await sql`
      insert into public.content_item_links (id, content_item_id, label, url)
      values (${link.id}, ${itemId}, ${link.label}, ${link.url})
    `;
  }
}

async function upsertState(userId, itemId, input, nowIso) {
  const sql = getSql();
  await sql`
    insert into public.user_item_state (
      user_id,
      content_item_id,
      state,
      mastery,
      should_review_again,
      review_interval_days,
      next_review_at,
      last_reviewed_at,
      deleted_at,
      notes_markdown,
      metadata_json,
      attempt_count,
      time_spent_minutes,
      confidence,
      last_attempted_at,
      leetcode_outcome,
      last_solved_at,
      solution_summary_markdown,
      created_at,
      updated_at
    )
    values (
      ${userId},
      ${itemId},
      ${input.state ?? "ACTIVE"},
      ${input.mastery ?? "MEDIUM"},
      ${Boolean(input.shouldReviewAgain ?? true)},
      ${Number(input.reviewIntervalDays ?? 7)},
      ${input.nextReviewAt ?? null},
      ${input.lastReviewedAt ?? null},
      ${null},
      ${""},
      ${asObject(input.userMetadata ?? {})},
      ${input.attemptCount ?? null},
      ${input.timeSpentMinutes ?? null},
      ${input.confidence ?? null},
      ${input.lastAttemptedAt ?? null},
      ${input.leetcodeOutcome ?? null},
      ${input.lastSolvedAt ?? null},
      ${input.solutionSummaryMarkdown ?? null},
      ${nowIso},
      ${nowIso}
    )
    on conflict (user_id, content_item_id) do update set
      state = excluded.state,
      mastery = excluded.mastery,
      should_review_again = excluded.should_review_again,
      review_interval_days = excluded.review_interval_days,
      next_review_at = excluded.next_review_at,
      last_reviewed_at = excluded.last_reviewed_at,
      metadata_json = excluded.metadata_json,
      attempt_count = excluded.attempt_count,
      time_spent_minutes = excluded.time_spent_minutes,
      confidence = excluded.confidence,
      last_attempted_at = excluded.last_attempted_at,
      leetcode_outcome = excluded.leetcode_outcome,
      last_solved_at = excluded.last_solved_at,
      solution_summary_markdown = excluded.solution_summary_markdown,
      updated_at = excluded.updated_at
  `;
}

export async function listAccessibleItemsForSeedUser({ type = "ALL", includeDeleted = false } = {}) {
  const user = await requireSeedUser();
  const sql = getSql();
  const contents =
    type === "ALL"
      ? await sql`
          select *
          from public.content_items
          where is_shared = true or owner_user_id = ${user.id}
          order by created_at asc
        `
      : await sql`
          select *
          from public.content_items
          where type = ${type}
            and (is_shared = true or owner_user_id = ${user.id})
          order by created_at asc
        `;
  const ids = contents.map((row) => row.id);
  const states =
    ids.length === 0
      ? []
      : await sql`
          select *
          from public.user_item_state
          where user_id = ${user.id}
            and content_item_id in ${sql(ids)}
        `;
  const links =
    ids.length === 0
      ? []
      : await sql`
          select *
          from public.content_item_links
          where content_item_id in ${sql(ids)}
          order by content_item_id asc, label asc, url asc
        `;

  const stateById = new Map(states.map((row) => [row.content_item_id, row]));
  const linksById = new Map();
  for (const link of links) {
    const current = linksById.get(link.content_item_id) ?? [];
    current.push({ id: link.id, label: link.label, url: link.url });
    linksById.set(link.content_item_id, current);
  }

  return contents
    .map((content) => hydrateItem(content, stateById.get(content.id) ?? null, linksById.get(content.id) ?? []))
    .filter((item) => includeDeleted || !item.deletedAt);
}

export async function hardDeletePrivateItemForSeedUser(itemId) {
  const user = await requireSeedUser();
  const sql = getSql();
  const result = await sql`
    delete from public.content_items
    where id = ${itemId}
      and owner_user_id = ${user.id}
  `;
  return result.count > 0;
}

export async function ingestPrivateItemForSeedUser(input) {
  const user = await requireSeedUser();
  const sql = getSql();
  const nowIso = new Date().toISOString();
  const existing = await getPrivateRecord(user.id, input);
  const itemId = existing?.id ?? randomUUID();
  const payload = buildPayload({ ...input, createdAt: existing?.created_at ?? nowIso, updatedAt: nowIso }, itemId);

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
      ${itemId},
      ${user.id},
      false,
      ${input.title},
      ${input.type},
      ${normalizeTags(input.tags)},
      ${null},
      ${toCanonicalKey(payload)},
      ${payload},
      ${existing?.created_at ?? nowIso},
      ${nowIso}
    )
    on conflict (id) do update set
      title = excluded.title,
      type = excluded.type,
      tags_json = excluded.tags_json,
      canonical_key = excluded.canonical_key,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at,
      deleted_at = null
  `;
  await replaceLinks(itemId, input.links ?? []);
  await upsertState(user.id, itemId, input, nowIso);

  if (input.markdownContent && input.type === "SYSTEM_DESIGN") {
    await sql`
      insert into public.user_item_docs (user_id, content_item_id, content_markdown, checksum, updated_at)
      values (${user.id}, ${itemId}, ${input.markdownContent}, '', ${nowIso})
      on conflict (user_id, content_item_id) do update set
        content_markdown = excluded.content_markdown,
        updated_at = excluded.updated_at
    `;
  }

  return { item: { id: itemId } };
}
