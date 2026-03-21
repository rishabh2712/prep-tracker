#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";
import { closeSql, ensureUserByEmail, getSql, normalizeTags, toCanonicalKey } from "./lib/shared-content-store.mjs";

const LEGACY_DB_PATH = process.env.LEGACY_SQLITE_PATH ?? path.join(process.cwd(), "data", "prep.db");
const BOOTSTRAP_EMAIL = process.env.MIGRATION_BOOTSTRAP_EMAIL;
const BOOTSTRAP_PASSWORD = process.env.MIGRATION_BOOTSTRAP_PASSWORD;
const BOOTSTRAP_NAME = process.env.MIGRATION_BOOTSTRAP_NAME;

function required(value, label) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${label}`);
  }
  return value;
}

function parseJson(raw, fallback = {}) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function dedupeLinks(links) {
  const seen = new Set();
  const out = [];
  for (const link of Array.isArray(links) ? links : []) {
    const url = String(link?.url ?? "").trim();
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: typeof link?.id === "string" && link.id ? link.id : null,
      label: String(link?.label ?? url),
      url,
    });
  }
  return out;
}

function inferSharedItem(row, payload) {
  const metadata = asObject(payload.metadata);
  const source = String(metadata.source ?? "").trim().toLowerCase();

  if (metadata.surface === "uber-frontend") return true;
  if (metadata.seedKey || metadata.frontendTab || metadata.bankId || metadata.sourceRefs || metadata.uberFrequencyImport || metadata.leetcodeWizard) {
    return true;
  }
  if (Array.isArray(metadata.companyFrequency) && metadata.companyFrequency.length > 0) return true;
  if (Array.isArray(metadata.sourceUrls) && metadata.sourceUrls.length > 0) return true;
  if (typeof metadata.sdTrack === "string" && metadata.sdTrack.trim()) return true;
  if (["leetcodewizard", "web-research-seed", "uber-prep-seed", "local-py-tutor"].includes(source)) return true;
  if (row.type === "LEETCODE" && (payload.problemLink || payload.problemSlug)) return true;
  if ((row.type === "SYSTEM_DESIGN" || row.type === "LLD" || row.type === "CS_FUNDAMENTALS") && (payload.systemTopic || payload.problemStatement || metadata.sdMarkdownPath)) {
    return true;
  }

  return false;
}

function toContentPayload(row, payload) {
  return {
    ...payload,
    id: row.id,
    title: payload.title ?? row.title,
    type: payload.type ?? row.type,
    tags: normalizeTags(Array.isArray(payload.tags) ? payload.tags : parseJson(row.tags_json, [])),
    deletedAt: row.deleted_at ?? null,
    createdAt: payload.createdAt ?? row.created_at,
    updatedAt: payload.updatedAt ?? row.updated_at,
    metadata: asObject(payload.metadata),
    links: dedupeLinks(payload.links),
  };
}

function toLearningState(row) {
  if (!row) return null;
  return {
    repetition: Number(row.repetition ?? 0),
    intervalDays: Number(row.interval_days ?? 7),
    easeFactor: Number(row.ease_factor ?? 2.5),
    lapses: Number(row.lapses ?? 0),
  };
}

function extractUserMetadata(payload, learningState, isShared) {
  const metadata = asObject(payload.metadata);
  if (!isShared) {
    return learningState ? { ...metadata, learningState } : metadata;
  }

  const userMetadata = {};
  for (const key of ["lastExecutionNotes", "lastExecutionOutcome", "lastExecutionAt"]) {
    if (key in metadata) {
      userMetadata[key] = metadata[key];
    }
  }
  if (learningState) {
    userMetadata.learningState = learningState;
  }
  return userMetadata;
}

async function ensureProfile(user) {
  const sql = getSql();
  const rawMeta = asObject(user.raw_user_meta_data);
  const displayName = String(rawMeta.display_name ?? BOOTSTRAP_NAME ?? user.email?.split("@")[0] ?? "Prep Tracker User");
  await sql`
    insert into public.profiles (user_id, email, display_name)
    values (${user.id}, ${user.email ?? null}, ${displayName})
    on conflict (user_id) do update set
      email = excluded.email,
      display_name = excluded.display_name
  `;
}

async function migrateLegacyGoals(db, userId) {
  const sql = getSql();
  const row = db.prepare("select * from settings where key = 'legacy_goals' limit 1").get();
  if (!row) return 0;

  const value = asObject(parseJson(row.value_json, {}));
  await sql`
    insert into public.user_settings (user_id, leetcode_target, system_design_target, target_date, updated_at)
    values (
      ${userId},
      ${Number(value.leetcodeTarget ?? 0)},
      ${Number(value.systemDesignTarget ?? 0)},
      ${value.targetDate ?? null},
      ${value.updatedAt ?? row.updated_at}
    )
    on conflict (user_id) do update set
      leetcode_target = excluded.leetcode_target,
      system_design_target = excluded.system_design_target,
      target_date = excluded.target_date,
      updated_at = excluded.updated_at
  `;
  return 1;
}

async function migrateItems(db, userId) {
  const sql = getSql();
  const items = db.prepare("select * from items order by created_at asc").all();
  const learningRows = db.prepare("select * from learning_states").all();
  const learningByItemId = new Map(learningRows.map((row) => [row.item_id, row]));
  let shared = 0;
  let privateCount = 0;

  for (const row of items) {
    const payload = asObject(parseJson(row.payload_json, {}));
    const contentPayload = toContentPayload(row, payload);
    const isShared = inferSharedItem(row, contentPayload);
    const learningState = toLearningState(learningByItemId.get(row.id));
    const canonicalKey = toCanonicalKey(contentPayload);
    const tags = normalizeTags(parseJson(row.tags_json, contentPayload.tags ?? []));

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
        ${row.id},
        ${isShared ? null : userId},
        ${isShared},
        ${row.title},
        ${row.type},
        ${tags},
        ${row.deleted_at ?? null},
        ${canonicalKey},
        ${contentPayload},
        ${row.created_at},
        ${row.updated_at}
      )
      on conflict (id) do update set
        owner_user_id = excluded.owner_user_id,
        is_shared = excluded.is_shared,
        title = excluded.title,
        type = excluded.type,
        tags_json = excluded.tags_json,
        deleted_at = excluded.deleted_at,
        canonical_key = excluded.canonical_key,
        payload_json = excluded.payload_json,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `;

    await sql`
      delete from public.content_item_links
      where content_item_id = ${row.id}
    `;
    for (const link of dedupeLinks(contentPayload.links)) {
      await sql`
        insert into public.content_item_links (id, content_item_id, label, url)
        values (${link.id ?? randomUUID()}, ${row.id}, ${link.label}, ${link.url})
      `;
    }

    const stateMetadata = extractUserMetadata(contentPayload, learningState, isShared);
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
        ${row.id},
        ${payload.state ?? row.state ?? "ACTIVE"},
        ${payload.mastery ?? row.mastery ?? "MEDIUM"},
        ${Boolean(payload.shouldReviewAgain ?? row.should_review_again ?? 1)},
        ${Number(payload.reviewIntervalDays ?? row.review_interval_days ?? learningState?.intervalDays ?? 7)},
        ${payload.nextReviewAt ?? row.next_review_at ?? learningByItemId.get(row.id)?.due_at ?? null},
        ${payload.lastReviewedAt ?? row.last_reviewed_at ?? learningByItemId.get(row.id)?.last_reviewed_at ?? null},
        ${row.deleted_at ?? null},
        ${""},
        ${stateMetadata},
        ${payload.attemptCount ?? null},
        ${payload.timeSpentMinutes ?? null},
        ${payload.confidence ?? null},
        ${payload.lastAttemptedAt ?? null},
        ${payload.leetcodeOutcome ?? null},
        ${payload.lastSolvedAt ?? null},
        ${payload.solutionSummaryMarkdown ?? null},
        ${row.created_at},
        ${row.updated_at}
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
        solution_summary_markdown = excluded.solution_summary_markdown,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `;

    if (isShared) shared += 1;
    else privateCount += 1;
  }

  return { total: items.length, shared, private: privateCount };
}

async function migrateGoals(db, userId) {
  const sql = getSql();
  const goals = db.prepare("select * from goals order by created_at asc").all();
  const goalItems = db.prepare("select * from goal_items").all();
  const goalDays = db.prepare("select * from goal_days").all();
  const goalDayEntries = db.prepare("select * from goal_day_entries").all();
  const goalTargets = db.prepare("select * from goal_targets").all();
  const goalSessions = db.prepare("select * from goal_sessions").all();

  for (const goal of goals) {
    await sql`
      insert into public.goals (
        id,
        user_id,
        name,
        description,
        start_date,
        end_date,
        leetcode_target,
        system_design_target,
        daily_minutes_target,
        status,
        created_at,
        updated_at
      )
      values (
        ${goal.id},
        ${userId},
        ${goal.name},
        ${goal.description ?? ""},
        ${goal.start_date},
        ${goal.end_date},
        ${Number(goal.leetcode_target ?? 0)},
        ${Number(goal.system_design_target ?? 0)},
        ${Number(goal.daily_minutes_target ?? 0)},
        ${goal.status},
        ${goal.created_at},
        ${goal.updated_at}
      )
      on conflict (id) do update set
        user_id = excluded.user_id,
        name = excluded.name,
        description = excluded.description,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        leetcode_target = excluded.leetcode_target,
        system_design_target = excluded.system_design_target,
        daily_minutes_target = excluded.daily_minutes_target,
        status = excluded.status,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `;
  }

  for (const row of goalItems) {
    await sql`
      insert into public.goal_items (goal_id, content_item_id, module_kind, selected_at)
      values (${row.goal_id}, ${row.item_id}, ${row.module_kind}, ${row.selected_at})
      on conflict (goal_id, content_item_id) do update set
        module_kind = excluded.module_kind,
        selected_at = excluded.selected_at
    `;
  }

  for (const row of goalDays) {
    await sql`
      insert into public.goal_days (
        id,
        goal_id,
        date,
        status,
        planned_minutes,
        actual_minutes,
        notes,
        created_at,
        updated_at
      )
      values (
        ${row.id},
        ${row.goal_id},
        ${row.date},
        ${row.status},
        ${Number(row.planned_minutes ?? 0)},
        ${Number(row.actual_minutes ?? 0)},
        ${row.notes ?? ""},
        ${row.created_at},
        ${row.updated_at}
      )
      on conflict (id) do update set
        goal_id = excluded.goal_id,
        date = excluded.date,
        status = excluded.status,
        planned_minutes = excluded.planned_minutes,
        actual_minutes = excluded.actual_minutes,
        notes = excluded.notes,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `;
  }

  for (const row of goalDayEntries) {
    await sql`
      insert into public.goal_day_entries (
        id,
        goal_day_id,
        goal_id,
        content_item_id,
        item_type,
        entry_type,
        created_at
      )
      values (
        ${row.id},
        ${row.goal_day_id},
        ${row.goal_id},
        ${row.item_id},
        ${row.item_type},
        ${row.entry_type},
        ${row.created_at}
      )
      on conflict (id) do update set
        goal_day_id = excluded.goal_day_id,
        goal_id = excluded.goal_id,
        content_item_id = excluded.content_item_id,
        item_type = excluded.item_type,
        entry_type = excluded.entry_type,
        created_at = excluded.created_at
    `;
  }

  for (const row of goalTargets) {
    await sql`
      insert into public.goal_targets (
        goal_id,
        module_kind,
        dimension,
        bucket_key,
        target_count,
        created_at,
        updated_at
      )
      values (
        ${row.goal_id},
        ${row.module_kind},
        ${row.dimension},
        ${row.bucket_key},
        ${Number(row.target_count ?? 0)},
        ${row.created_at},
        ${row.updated_at}
      )
      on conflict (goal_id, module_kind, dimension, bucket_key) do update set
        target_count = excluded.target_count,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `;
  }

  for (const row of goalSessions) {
    await sql`
      insert into public.goal_sessions (
        id,
        goal_id,
        content_item_id,
        module_kind,
        action,
        session_at,
        minutes_spent,
        notes_markdown,
        created_at,
        updated_at
      )
      values (
        ${row.id},
        ${row.goal_id},
        ${row.item_id},
        ${row.module_kind},
        ${row.action},
        ${row.session_at},
        ${Number(row.minutes_spent ?? 0)},
        ${row.notes_markdown ?? ""},
        ${row.created_at},
        ${row.updated_at}
      )
      on conflict (id) do update set
        goal_id = excluded.goal_id,
        content_item_id = excluded.content_item_id,
        module_kind = excluded.module_kind,
        action = excluded.action,
        session_at = excluded.session_at,
        minutes_spent = excluded.minutes_spent,
        notes_markdown = excluded.notes_markdown,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `;
  }

  return {
    goals: goals.length,
    goalItems: goalItems.length,
    goalDays: goalDays.length,
    goalDayEntries: goalDayEntries.length,
    goalTargets: goalTargets.length,
    goalSessions: goalSessions.length,
  };
}

async function migrateReviewLogs(db, userId) {
  const sql = getSql();
  const rows = db.prepare("select * from review_logs order by created_at asc").all();
  for (const row of rows) {
    await sql`
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
        ${row.id},
        ${userId},
        ${row.item_id},
        ${row.goal_id ?? null},
        ${row.outcome},
        ${Number(row.quality ?? 0)},
        ${row.notes_markdown ?? ""},
        ${row.previous_review_at ?? null},
        ${row.next_review_at},
        ${Number(row.interval_before ?? 0)},
        ${Number(row.interval_after ?? 0)},
        ${row.created_at}
      )
      on conflict (id) do update set
        user_id = excluded.user_id,
        content_item_id = excluded.content_item_id,
        goal_id = excluded.goal_id,
        outcome = excluded.outcome,
        quality = excluded.quality,
        notes_markdown = excluded.notes_markdown,
        previous_review_at = excluded.previous_review_at,
        next_review_at = excluded.next_review_at,
        interval_before = excluded.interval_before,
        interval_after = excluded.interval_after,
        created_at = excluded.created_at
    `;
  }
  return rows.length;
}

async function migrateChangeLogs(db, userId) {
  const sql = getSql();
  const rows = db.prepare("select * from change_logs order by created_at asc").all();
  const contentIds = new Set(
    (
      await sql`
        select id
        from public.content_items
      `
    ).map((row) => row.id),
  );
  for (const row of rows) {
    const contentItemId = row.item_id && contentIds.has(row.item_id) ? row.item_id : null;
    await sql`
      insert into public.user_change_logs (id, user_id, content_item_id, action, details_json, created_at)
      values (
        ${row.id},
        ${userId},
        ${contentItemId},
        ${row.action},
        ${parseJson(row.details_json, {})},
        ${row.created_at}
      )
      on conflict (id) do update set
        user_id = excluded.user_id,
        content_item_id = excluded.content_item_id,
        action = excluded.action,
        details_json = excluded.details_json,
        created_at = excluded.created_at
    `;
  }
  return rows.length;
}

async function migrateDocs(db, userId) {
  const sql = getSql();
  const rows = db.prepare("select * from item_docs").all();
  let migrated = 0;
  let missing = 0;

  for (const row of rows) {
    let content = null;
    try {
      await access(row.doc_path);
      content = await readFile(row.doc_path, "utf8");
    } catch {
      missing += 1;
      continue;
    }

    const checksum = createHash("sha256").update(content).digest("hex");
    await sql`
      insert into public.user_item_docs (user_id, content_item_id, content_markdown, checksum, updated_at)
      values (${userId}, ${row.item_id}, ${content}, ${checksum}, ${row.updated_at})
      on conflict (user_id, content_item_id) do update set
        content_markdown = excluded.content_markdown,
        checksum = excluded.checksum,
        updated_at = excluded.updated_at
    `;
    migrated += 1;
  }

  return { migrated, missing };
}

async function main() {
  required(BOOTSTRAP_EMAIL, "MIGRATION_BOOTSTRAP_EMAIL");
  const bootstrapUser = await ensureUserByEmail({
    email: BOOTSTRAP_EMAIL,
    password: BOOTSTRAP_PASSWORD,
    displayName: BOOTSTRAP_NAME,
  });
  await ensureProfile(bootstrapUser);

  const legacyDb = new Database(LEGACY_DB_PATH, { readonly: true });

  const legacyGoals = await migrateLegacyGoals(legacyDb, bootstrapUser.id);
  const itemStats = await migrateItems(legacyDb, bootstrapUser.id);
  const goalStats = await migrateGoals(legacyDb, bootstrapUser.id);
  const reviewCount = await migrateReviewLogs(legacyDb, bootstrapUser.id);
  const changeCount = await migrateChangeLogs(legacyDb, bootstrapUser.id);
  const docStats = await migrateDocs(legacyDb, bootstrapUser.id);

  legacyDb.close();

  console.log("Legacy SQLite migration complete");
  console.log(`- bootstrap user: ${bootstrapUser.email} (${bootstrapUser.id})`);
  console.log(`- legacy goals rows: ${legacyGoals}`);
  console.log(`- items migrated: ${itemStats.total} (${itemStats.shared} shared / ${itemStats.private} private)`);
  console.log(`- goals migrated: ${goalStats.goals}`);
  console.log(`- goal items / days / entries / targets / sessions: ${goalStats.goalItems} / ${goalStats.goalDays} / ${goalStats.goalDayEntries} / ${goalStats.goalTargets} / ${goalStats.goalSessions}`);
  console.log(`- review logs migrated: ${reviewCount}`);
  console.log(`- change logs migrated: ${changeCount}`);
  console.log(`- docs migrated: ${docStats.migrated} (${docStats.missing} missing files skipped)`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSql();
  });
