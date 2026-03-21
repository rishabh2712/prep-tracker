import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { nextReviewFromNow } from "@/lib/schedule";
import type { ListItemsParams, PrepItem, ReviewLog } from "@/lib/types";
import type { ItemCreateInput, ItemUpdateInput, ReviewInput } from "@/lib/validators";
import { getSql } from "@/lib/db/sql";
import type {
  ContentItemLinkRow,
  ContentItemRow,
  UserItemStateRow,
  UserReviewLogRow,
} from "@/lib/db/types";
import {
  addChangeLog,
  defaultItem,
  DuplicateItemError,
  hydratePrepItem,
  mapLinks,
  mapReviewRow,
  normalizeTags,
  outcomeToQuality,
  sanitizeTypeSpecificFields,
  sm2NextState,
  toCanonicalKey,
  toSharedPayload,
} from "@/lib/db/prep-items";

type AccessRecord = {
  content: ContentItemRow;
  state: UserItemStateRow | null;
  links: ContentItemLinkRow[];
};

function asSql(tx: TransactionSql<Record<string, never>>): Sql {
  return tx as unknown as Sql;
}

const USER_ONLY_UPDATE_KEYS = new Set([
  "notesMarkdown",
  "state",
  "mastery",
  "shouldReviewAgain",
  "reviewIntervalDays",
  "nextReviewAt",
  "lastReviewedAt",
  "attemptCount",
  "timeSpentMinutes",
  "confidence",
  "lastAttemptedAt",
  "leetcodeOutcome",
  "lastSolvedAt",
  "solutionSummaryMarkdown",
  "metadata",
]);

function safeJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function toArrayJson(value: unknown): string {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function toSortableTime(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (value == null) return 0;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export async function fetchHydratedAccessRecords(sql: Sql, userId: string, contentIds?: string[]): Promise<AccessRecord[]> {
  let contents: ContentItemRow[] = [];

  if (contentIds && contentIds.length === 0) {
    return [];
  }

  if (contentIds) {
    contents = await sql<ContentItemRow[]>`
      select *
      from public.content_items
      where id in ${sql(contentIds)}
        and (is_shared = true or owner_user_id = ${userId})
      order by created_at asc
    `;
  } else {
    contents = await sql<ContentItemRow[]>`
      select *
      from public.content_items
      where is_shared = true or owner_user_id = ${userId}
      order by created_at asc
    `;
  }

  const ids = contents.map((row) => row.id);
  const states =
    ids.length === 0
      ? []
      : await sql<UserItemStateRow[]>`
          select *
          from public.user_item_state
          where user_id = ${userId}
            and content_item_id in ${sql(ids)}
        `;
  const links =
    ids.length === 0
      ? []
      : await sql<ContentItemLinkRow[]>`
          select *
          from public.content_item_links
          where content_item_id in ${sql(ids)}
          order by content_item_id asc, label asc
        `;

  const statesById = new Map(states.map((row) => [row.content_item_id, row]));
  const linksById = new Map<string, ContentItemLinkRow[]>();
  for (const row of links) {
    const list = linksById.get(row.content_item_id) ?? [];
    list.push(row);
    linksById.set(row.content_item_id, list);
  }

  return contents.map((content) => ({
    content,
    state: statesById.get(content.id) ?? null,
    links: linksById.get(content.id) ?? [],
  }));
}

export async function getAccessibleItemsByIds(userId: string, contentIds: string[]): Promise<PrepItem[]> {
  const sql = getSql();
  const records = await fetchHydratedAccessRecords(sql, userId, contentIds);
  return records.map((record) => hydratePrepItem({ content: record.content, state: record.state, links: mapLinks(record.links) }));
}

export async function listAccessibleItems(userId: string, params: ListItemsParams): Promise<PrepItem[]> {
  const sql = getSql();
  const hydrated = await fetchHydratedAccessRecords(sql, userId);
  const items = hydrated.map((record) => hydratePrepItem({ content: record.content, state: record.state, links: mapLinks(record.links) }));

  return items
    .filter((item) => (params.includeDeleted ? true : !item.deletedAt))
    .filter((item) => (params.type && params.type !== "ALL" ? item.type === params.type : true))
    .filter((item) => (params.dueOnly ? Boolean(item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now()) : true))
    .filter((item) => (params.shouldReviewOnly ? item.shouldReviewAgain : true))
    .filter((item) => {
      const q = params.q?.trim().toLowerCase();
      if (!q) return true;
      const haystack = [
        item.title,
        item.type,
        item.problemSlug ?? "",
        item.problemLink ?? "",
        item.pattern ?? "",
        item.systemTopic ?? "",
        ...(item.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => toSortableTime(b.updatedAt) - toSortableTime(a.updatedAt));
}

export async function getAccessibleItem(userId: string, itemId: string): Promise<PrepItem | null> {
  const sql = getSql();
  const [record] = await fetchHydratedAccessRecords(sql, userId, [itemId]);
  if (!record) return null;
  return hydratePrepItem({ content: record.content, state: record.state, links: mapLinks(record.links) });
}

async function getAccessRecord(sql: Sql, userId: string, itemId: string): Promise<AccessRecord | null> {
  const [record] = await fetchHydratedAccessRecords(sql, userId, [itemId]);
  return record ?? null;
}

async function findDuplicate(sql: Sql, userId: string, candidate: Pick<PrepItem, "type" | "problemLink" | "problemSlug" | "title" | "systemTopic">, excludeId?: string) {
  const canonicalKey = toCanonicalKey(candidate);
  if (!canonicalKey) return null;

  const matches = await sql<ContentItemRow[]>`
    select *
    from public.content_items
    where canonical_key = ${canonicalKey}
      and (is_shared = true or owner_user_id = ${userId})
    limit 5
  `;

  for (const row of matches) {
    if (excludeId && row.id === excludeId) continue;
    const [state] = await sql<UserItemStateRow[]>`
      select *
      from public.user_item_state
      where user_id = ${userId}
        and content_item_id = ${row.id}
      limit 1
    `;
    const deletedAt = state?.deleted_at ?? row.deleted_at;
    return { row, deletedAt };
  }

  return null;
}

async function replaceLinks(sql: Sql, contentItemId: string, links: Array<{ id?: string; label: string; url: string }>) {
  await sql`delete from public.content_item_links where content_item_id = ${contentItemId}`;
  for (const link of links) {
    await sql`
      insert into public.content_item_links (id, content_item_id, label, url)
      values (${link.id ?? randomUUID()}, ${contentItemId}, ${link.label.trim()}, ${link.url.trim()})
    `;
  }
}

async function upsertUserState(sql: Sql, userId: string, item: PrepItem, existing: UserItemStateRow | null) {
  const metadata = item.isShared
    ? { ...(existing?.metadata_json ?? {}), ...((item.metadata ?? {}) as Record<string, unknown>) }
    : {};

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
      solution_summary_markdown
    )
    values (
      ${userId},
      ${item.id},
      ${item.state},
      ${item.mastery},
      ${item.shouldReviewAgain},
      ${item.reviewIntervalDays},
      ${item.nextReviewAt},
      ${item.lastReviewedAt},
      ${item.deletedAt},
      ${item.notesMarkdown},
      ${safeJson(item.isShared ? metadata : {})}::jsonb,
      ${item.attemptCount},
      ${item.timeSpentMinutes},
      ${item.confidence},
      ${item.lastAttemptedAt},
      ${item.leetcodeOutcome},
      ${item.lastSolvedAt},
      ${item.solutionSummaryMarkdown}
    )
    on conflict (user_id, content_item_id) do update set
      state = excluded.state,
      mastery = excluded.mastery,
      should_review_again = excluded.should_review_again,
      review_interval_days = excluded.review_interval_days,
      next_review_at = excluded.next_review_at,
      last_reviewed_at = excluded.last_reviewed_at,
      deleted_at = excluded.deleted_at,
      notes_markdown = excluded.notes_markdown,
      metadata_json = excluded.metadata_json,
      attempt_count = excluded.attempt_count,
      time_spent_minutes = excluded.time_spent_minutes,
      confidence = excluded.confidence,
      last_attempted_at = excluded.last_attempted_at,
      leetcode_outcome = excluded.leetcode_outcome,
      last_solved_at = excluded.last_solved_at,
      solution_summary_markdown = excluded.solution_summary_markdown
  `;
}

function toPrivateItemPayload(input: ItemCreateInput, now: string): PrepItem {
  return sanitizeTypeSpecificFields({
    ...defaultItem(randomUUID(), input.type, now),
    ownerUserId: null,
    isShared: false,
    title: input.title.trim(),
    type: input.type,
    notesMarkdown: input.notesMarkdown ?? "",
    state: input.state ?? "ACTIVE",
    mastery: input.mastery ?? "MEDIUM",
    shouldReviewAgain: input.shouldReviewAgain ?? true,
    reviewIntervalDays: Math.max(1, input.reviewIntervalDays ?? 7),
    nextReviewAt: input.nextReviewAt ?? nextReviewFromNow(input.reviewIntervalDays ?? 7),
    lastReviewedAt: null,
    tags: normalizeTags(input.tags),
    deletedAt: null,
    links: (input.links ?? []).map((link) => ({ id: link.id ?? randomUUID(), label: link.label.trim(), url: link.url.trim() })),
    platform: input.platform,
    problemLink: input.problemLink,
    problemSlug: input.problemSlug,
    difficulty: input.difficulty,
    pattern: input.pattern,
    attemptCount: input.attemptCount,
    timeSpentMinutes: input.timeSpentMinutes,
    confidence: input.confidence,
    lastAttemptedAt: input.lastAttemptedAt,
    leetcodeOutcome: input.leetcodeOutcome,
    lastSolvedAt: input.lastSolvedAt,
    solutionSummaryMarkdown: input.solutionSummaryMarkdown,
    systemTopic: input.systemTopic,
    systemScaleNotes: input.systemScaleNotes,
    problemStatement: input.problemStatement,
    functionalRequirements: input.functionalRequirements,
    nonFunctionalRequirements: input.nonFunctionalRequirements,
    capacityEstimates: input.capacityEstimates,
    apiContracts: input.apiContracts,
    dataModelNotes: input.dataModelNotes,
    architectureNotes: input.architectureNotes,
    componentDeepDives: input.componentDeepDives,
    scalingStrategy: input.scalingStrategy,
    consistencyTradeoffs: input.consistencyTradeoffs,
    cachingStrategy: input.cachingStrategy,
    failureModesRecovery: input.failureModesRecovery,
    observability: input.observability,
    securityPrivacy: input.securityPrivacy,
    costConsiderations: input.costConsiderations,
    alternativesTradeoffs: input.alternativesTradeoffs,
    whatIMissed: input.whatIMissed,
    followUpTopics: input.followUpTopics,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  });
}

export async function createPrivateItem(userId: string, input: ItemCreateInput): Promise<PrepItem> {
  const sql = getSql();
  const now = new Date().toISOString();
  const item = toPrivateItemPayload(input, now);

  const duplicate = await findDuplicate(sql, userId, item);
  if (duplicate) {
    throw new DuplicateItemError("Record already exists in tracker", duplicate.row.id, Boolean(duplicate.deletedAt));
  }

  await sql.begin(async (tx: TransactionSql<Record<string, never>>) => {
    const txSql = asSql(tx);
    await txSql`
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
        ${item.id},
        ${userId},
        false,
        ${item.title},
        ${item.type},
        ${toArrayJson(item.tags)}::jsonb,
        ${null},
        ${toCanonicalKey(item)},
        ${safeJson(toSharedPayload({ ...item, notesMarkdown: "" }))}::jsonb,
        ${item.createdAt},
        ${item.updatedAt}
      )
    `;

    await replaceLinks(txSql, item.id, item.links);
    await upsertUserState(txSql, userId, item, null);
    await addChangeLog(txSql, userId, "CREATE", item.id, { title: item.title, type: item.type });
  });

  const created = await getAccessibleItem(userId, item.id);
  if (!created) {
    throw new Error("Unable to load newly created item");
  }
  return created;
}

export async function updateAccessibleItem(userId: string, itemId: string, input: ItemUpdateInput): Promise<PrepItem | null> {
  const sql = getSql();
  const access = await getAccessRecord(sql, userId, itemId);
  if (!access) return null;

  const existing = hydratePrepItem({ content: access.content, state: access.state, links: mapLinks(access.links) });
  const now = new Date().toISOString();

  if (access.content.is_shared) {
    const disallowed = Object.keys(input).find((key) => !USER_ONLY_UPDATE_KEYS.has(key));
    if (disallowed) {
      throw new Error("Shared bank content is read-only. Only personal progress and notes can be updated.");
    }
  } else {
    const candidate = sanitizeTypeSpecificFields({
      ...existing,
      ...input,
      title: input.title?.trim() ?? existing.title,
      tags: input.tags ? normalizeTags(input.tags) : existing.tags,
      links: input.links
        ? input.links.map((link) => ({ id: link.id ?? randomUUID(), label: link.label.trim(), url: link.url.trim() }))
        : existing.links,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: now,
    });

    const duplicate = await findDuplicate(sql, userId, candidate, itemId);
    if (duplicate) {
      throw new DuplicateItemError("Record already exists in tracker", duplicate.row.id, Boolean(duplicate.deletedAt));
    }

    await sql.begin(async (tx: TransactionSql<Record<string, never>>) => {
      const txSql = asSql(tx);
      await txSql`
        update public.content_items
        set
          title = ${candidate.title},
          type = ${candidate.type},
          tags_json = ${toArrayJson(candidate.tags)}::jsonb,
          canonical_key = ${toCanonicalKey(candidate)},
          payload_json = ${safeJson(toSharedPayload({ ...candidate, notesMarkdown: "" }))}::jsonb,
          deleted_at = ${candidate.deletedAt},
          updated_at = ${candidate.updatedAt}
        where id = ${candidate.id}
      `;
      await replaceLinks(txSql, candidate.id, candidate.links);
      await upsertUserState(txSql, userId, candidate, access.state);
      await addChangeLog(txSql, userId, "UPDATE", candidate.id, {
        titleBefore: existing.title,
        titleAfter: candidate.title,
        stateBefore: existing.state,
        stateAfter: candidate.state,
      });
    });

    return await getAccessibleItem(userId, itemId);
  }

  const updated = sanitizeTypeSpecificFields({
    ...existing,
    ...input,
    title: existing.title,
    type: existing.type,
    tags: existing.tags,
    links: existing.links,
    metadata: { ...(existing.metadata ?? {}), ...(input.metadata ?? {}) },
    updatedAt: now,
    ownerUserId: existing.ownerUserId,
    isShared: existing.isShared,
  });

  await sql.begin(async (tx: TransactionSql<Record<string, never>>) => {
    const txSql = asSql(tx);
    await upsertUserState(txSql, userId, updated, access.state);
    await addChangeLog(txSql, userId, "UPDATE", itemId, {
      titleBefore: existing.title,
      titleAfter: existing.title,
      stateBefore: existing.state,
      stateAfter: updated.state,
    });
  });

  return await getAccessibleItem(userId, itemId);
}

export async function softDeleteAccessibleItem(userId: string, itemId: string): Promise<PrepItem | null> {
  const sql = getSql();
  const access = await getAccessRecord(sql, userId, itemId);
  if (!access) return null;
  const existing = hydratePrepItem({ content: access.content, state: access.state, links: mapLinks(access.links) });
  if (existing.deletedAt) return existing;

  const deletedAt = new Date().toISOString();

  await sql.begin(async (tx: TransactionSql<Record<string, never>>) => {
    const txSql = asSql(tx);
    if (access.content.is_shared) {
      await upsertUserState(txSql, userId, { ...existing, deletedAt, updatedAt: deletedAt }, access.state);
    } else {
      await txSql`
        update public.content_items
        set deleted_at = ${deletedAt}, updated_at = ${deletedAt}
        where id = ${itemId}
      `;
    }
    await addChangeLog(txSql, userId, "DELETE", itemId, { title: existing.title });
  });

  return await getAccessibleItem(userId, itemId);
}

export async function restoreAccessibleItem(userId: string, itemId: string): Promise<PrepItem | null> {
  const sql = getSql();
  const access = await getAccessRecord(sql, userId, itemId);
  if (!access) return null;
  const existing = hydratePrepItem({ content: access.content, state: access.state, links: mapLinks(access.links) });
  if (!existing.deletedAt) return existing;

  const now = new Date().toISOString();
  await sql.begin(async (tx: TransactionSql<Record<string, never>>) => {
    const txSql = asSql(tx);
    if (access.content.is_shared) {
      await upsertUserState(txSql, userId, { ...existing, deletedAt: null, updatedAt: now }, access.state);
    } else {
      await txSql`
        update public.content_items
        set deleted_at = null, updated_at = ${now}
        where id = ${itemId}
      `;
    }
    await addChangeLog(txSql, userId, "RESTORE", itemId, { title: existing.title });
  });

  return await getAccessibleItem(userId, itemId);
}

export async function hardDeleteAccessibleItem(userId: string, itemId: string): Promise<boolean> {
  const sql = getSql();
  const access = await getAccessRecord(sql, userId, itemId);
  if (!access) return false;
  if (access.content.is_shared) return false;

  await sql.begin(async (tx: TransactionSql<Record<string, never>>) => {
    const txSql = asSql(tx);
    await txSql`delete from public.content_items where id = ${itemId} and owner_user_id = ${userId}`;
    await addChangeLog(txSql, userId, "HARD_DELETE", itemId, { title: access.content.title });
  });

  return true;
}

export async function listReviewsForItem(userId: string, itemId: string): Promise<ReviewLog[]> {
  const sql = getSql();
  const rows = await sql<UserReviewLogRow[]>`
    select *
    from public.user_review_logs
    where user_id = ${userId}
      and content_item_id = ${itemId}
    order by created_at desc
  `;
  return rows.map(mapReviewRow);
}

function readLearningState(metadata: Record<string, unknown>) {
  const current = (metadata.learningState ?? {}) as Record<string, unknown>;
  return {
    repetition: Number(current.repetition ?? 0),
    intervalDays: Number(current.intervalDays ?? 7),
    easeFactor: Number(current.easeFactor ?? 2.5),
    lapses: Number(current.lapses ?? 0),
  };
}

export async function addReviewForItem(userId: string, itemId: string, input: ReviewInput, goalId?: string) {
  const sql = getSql();
  const access = await getAccessRecord(sql, userId, itemId);
  if (!access) return null;

  const item = hydratePrepItem({ content: access.content, state: access.state, links: mapLinks(access.links) });
  const now = new Date().toISOString();
  const quality = outcomeToQuality(input.outcome);
  const current = readLearningState((item.metadata ?? {}) as Record<string, unknown>);
  const next = sm2NextState(current, quality);
  const nextReviewAt = nextReviewFromNow(next.intervalDays);

  const updated: PrepItem = {
    ...item,
    reviewIntervalDays: next.intervalDays,
    lastReviewedAt: now,
    nextReviewAt,
    shouldReviewAgain: input.outcome !== "EASY",
    updatedAt: now,
    metadata: {
      ...(item.metadata ?? {}),
      learningState: next,
    },
  };

  const reviewId = randomUUID();

  await sql.begin(async (tx: TransactionSql<Record<string, never>>) => {
    const txSql = asSql(tx);
    await txSql`
      insert into public.user_review_logs (
        id,
        user_id,
        content_item_id,
        goal_id,
        outcome,
        quality,
        notes_markdown,
        previous_review_at,
        next_review_at,
        interval_before,
        interval_after,
        created_at
      )
      values (
        ${reviewId},
        ${userId},
        ${itemId},
        ${goalId ?? null},
        ${input.outcome},
        ${quality},
        ${input.notesMarkdown ?? ""},
        ${item.lastReviewedAt},
        ${nextReviewAt},
        ${current.intervalDays},
        ${next.intervalDays},
        ${now}
      )
    `;
    await upsertUserState(txSql, userId, updated, access.state);
    await addChangeLog(txSql, userId, "REVIEW", itemId, { outcome: input.outcome, nextInterval: next.intervalDays, sm2Quality: quality });
  });

  return {
    item: await getAccessibleItem(userId, itemId),
    review: {
      id: reviewId,
      itemId,
      outcome: input.outcome,
      notesMarkdown: input.notesMarkdown ?? "",
      previousReviewAt: item.lastReviewedAt,
      nextReviewAt,
      createdAt: now,
    } satisfies ReviewLog,
  };
}

export async function listBankRecords(userId: string, kind: "LEETCODE" | "SYSTEM_DESIGN", q?: string) {
  const items = await listAccessibleItems(userId, { type: "ALL", includeDeleted: false });
  return items.filter((item) => item.type === kind && (!q || item.title.toLowerCase().includes(q.toLowerCase())));
}
