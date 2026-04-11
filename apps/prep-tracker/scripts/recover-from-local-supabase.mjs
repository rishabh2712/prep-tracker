import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const dataDir = path.join(appRoot, "data");
const defaultDbPath = path.join(dataDir, "prep.db");
const backupDir = path.join(dataDir, "recovery-backups");

const sqlitePath = process.env.PREP_TRACKER_DB_PATH?.trim() || defaultDbPath;
const containerName = process.env.PREP_TRACKER_SUPABASE_DB_CONTAINER?.trim() || "supabase_db_prep-tracker";

const sqliteWalPath = `${sqlitePath}-wal`;
const sqliteShmPath = `${sqlitePath}-shm`;

function toJsonText(tableName, orderByClause = "") {
  return `select coalesce(json_agg(to_jsonb(t)), '[]'::json)::text from (select * from public.${tableName}${orderByClause ? ` order by ${orderByClause}` : ""}) t`;
}

function pgQuery(sql) {
  return execFileSync(
    "docker",
    ["exec", containerName, "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", sql],
    {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }
  ).trim();
}

function pgRows(tableName, orderByClause = "") {
  const raw = pgQuery(toJsonText(tableName, orderByClause));
  return JSON.parse(raw || "[]");
}

function iso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function json(value, fallback) {
  if (value == null) return fallback;
  return JSON.stringify(value);
}

function normalizeLinks(rows) {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    url: row.url,
  }));
}

function mergeMetadata(payload, userState) {
  const payloadMetadata =
    payload && typeof payload.metadata === "object" && !Array.isArray(payload.metadata) ? payload.metadata : {};
  const stateMetadata = userState && typeof userState.metadata_json === "object" && !Array.isArray(userState.metadata_json) ? userState.metadata_json : {};
  const merged = {
    ...payloadMetadata,
    ...stateMetadata,
  };

  const learningState =
    stateMetadata && typeof stateMetadata.learningState === "object" && !Array.isArray(stateMetadata.learningState)
      ? stateMetadata.learningState
      : null;

  if (learningState && (!merged.srs || typeof merged.srs !== "object")) {
    merged.srs = {
      repetition: Number(learningState.repetition ?? 0) || 0,
      intervalDays: Math.max(1, Number(learningState.intervalDays ?? userState?.review_interval_days ?? 7) || 7),
      easeFactor: Math.max(1.3, Number(learningState.easeFactor ?? 2.5) || 2.5),
      lapses: Math.max(0, Number(learningState.lapses ?? 0) || 0),
    };
  }

  return merged;
}

function backupFile(filePath, timestampTag) {
  if (!existsSync(filePath)) return;
  const stats = statSync(filePath);
  if (stats.size === 0) return;
  mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${path.basename(filePath)}.${timestampTag}.bak`);
  copyFileSync(filePath, backupPath);
  console.log(`Backed up ${path.basename(filePath)} -> ${backupPath}`);
}

function rotateExistingSqlite(timestampTag) {
  backupFile(sqlitePath, timestampTag);
  backupFile(sqliteWalPath, timestampTag);
  backupFile(sqliteShmPath, timestampTag);
  rmSync(sqlitePath, { force: true });
  rmSync(sqliteWalPath, { force: true });
  rmSync(sqliteShmPath, { force: true });
  mkdirSync(path.dirname(sqlitePath), { recursive: true });
}

function createSchema(db) {
  db.exec(`
    create table if not exists items (
      id text primary key,
      title text not null,
      type text not null,
      notes_markdown text not null default '',
      state text not null default 'ACTIVE',
      mastery text not null default 'MEDIUM',
      should_review_again integer not null default 1,
      review_interval_days integer not null default 7,
      next_review_at text,
      last_reviewed_at text,
      tags_json text not null default '[]',
      links_json text not null default '[]',
      deleted_at text,
      platform text,
      problem_link text,
      problem_slug text,
      difficulty text,
      pattern text,
      attempt_count integer,
      time_spent_minutes integer,
      confidence text,
      last_attempted_at text,
      leetcode_outcome text,
      last_solved_at text,
      solution_summary_markdown text,
      system_topic text,
      system_scale_notes text,
      problem_statement text,
      functional_requirements text,
      non_functional_requirements text,
      capacity_estimates text,
      api_contracts text,
      data_model_notes text,
      architecture_notes text,
      component_deep_dives text,
      scaling_strategy text,
      consistency_tradeoffs text,
      caching_strategy text,
      failure_modes_recovery text,
      observability text,
      security_privacy text,
      cost_considerations text,
      alternatives_tradeoffs text,
      what_i_missed text,
      follow_up_topics text,
      metadata_json text not null default '{}',
      canonical_key text,
      owner_user_id text,
      is_shared integer not null default 0,
      created_at text not null,
      updated_at text not null
    );
    create unique index if not exists idx_items_canonical_key on items(canonical_key) where canonical_key is not null;
    create index if not exists idx_items_type on items(type);
    create index if not exists idx_items_due on items(next_review_at);

    create table if not exists review_logs (
      id text primary key,
      item_id text not null references items(id) on delete cascade,
      goal_id text,
      outcome text not null,
      quality integer not null,
      notes_markdown text not null default '',
      previous_review_at text,
      next_review_at text not null,
      interval_before integer not null,
      interval_after integer not null,
      created_at text not null
    );

    create table if not exists change_logs (
      id text primary key,
      item_id text references items(id) on delete set null,
      action text not null,
      details_json text not null default '{}',
      created_at text not null
    );

    create table if not exists item_docs (
      item_id text primary key references items(id) on delete cascade,
      content_markdown text not null default '',
      checksum text not null default '',
      updated_at text not null
    );

    create table if not exists goals (
      id text primary key,
      name text not null unique,
      description text not null default '',
      start_date text not null,
      end_date text not null,
      leetcode_target integer not null default 0,
      system_design_target integer not null default 0,
      daily_minutes_target integer not null default 120,
      status text not null default 'ACTIVE',
      created_at text not null,
      updated_at text not null
    );

    create table if not exists goal_items (
      goal_id text not null references goals(id) on delete cascade,
      item_id text not null references items(id) on delete cascade,
      module_kind text not null,
      selected_at text not null,
      primary key (goal_id, item_id)
    );

    create table if not exists goal_days (
      id text primary key,
      goal_id text not null references goals(id) on delete cascade,
      date text not null,
      status text not null default 'NOT_STARTED',
      planned_minutes integer not null default 0,
      actual_minutes integer not null default 0,
      notes text not null default '',
      created_at text not null,
      updated_at text not null,
      unique (goal_id, date)
    );

    create table if not exists goal_day_entries (
      id text primary key,
      goal_day_id text not null references goal_days(id) on delete cascade,
      goal_id text not null references goals(id) on delete cascade,
      item_id text not null references items(id) on delete cascade,
      item_type text not null,
      entry_type text not null,
      created_at text not null,
      unique (goal_day_id, item_id, entry_type)
    );

    create table if not exists goal_targets (
      goal_id text not null references goals(id) on delete cascade,
      module_kind text not null,
      dimension text not null,
      bucket_key text not null,
      target_count integer not null,
      created_at text not null,
      updated_at text not null,
      primary key (goal_id, module_kind, dimension, bucket_key)
    );

    create table if not exists goal_sessions (
      id text primary key,
      goal_id text not null references goals(id) on delete cascade,
      item_id text not null references items(id) on delete cascade,
      module_kind text not null,
      action text not null,
      session_at text not null,
      minutes_spent integer not null default 0,
      notes_markdown text not null default '',
      created_at text not null,
      updated_at text not null
    );
    create index if not exists idx_goal_sessions_goal_date on goal_sessions(goal_id, session_at desc);
  `);
}

function main() {
  const timestampTag = new Date().toISOString().replace(/[:.]/g, "-");
  console.log(`Reading old local Supabase data from container: ${containerName}`);

  const contentItems = pgRows("content_items", "updated_at desc");
  const contentLinks = pgRows("content_item_links", "content_item_id asc, id asc");
  const userStateRows = pgRows("user_item_state", "content_item_id asc");
  const reviewLogs = pgRows("user_review_logs", "created_at asc");
  const changeLogs = pgRows("user_change_logs", "created_at asc");
  const itemDocs = pgRows("user_item_docs", "content_item_id asc");
  const goals = pgRows("goals", "created_at asc");
  const goalItems = pgRows("goal_items", "selected_at asc");
  const goalDays = pgRows("goal_days", "date asc");
  const goalDayEntries = pgRows("goal_day_entries", "created_at asc");
  const goalTargets = pgRows("goal_targets", "created_at asc");
  const goalSessions = pgRows("goal_sessions", "session_at asc");

  if (contentItems.length === 0) {
    throw new Error("No content_items found in the old local Supabase database.");
  }

  rotateExistingSqlite(timestampTag);

  const linksByItemId = new Map();
  for (const row of contentLinks) {
    const next = linksByItemId.get(row.content_item_id) ?? [];
    next.push(row);
    linksByItemId.set(row.content_item_id, next);
  }

  const stateByItemId = new Map(userStateRows.map((row) => [row.content_item_id, row]));

  const db = new Database(sqlitePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  createSchema(db);

  const insertItem = db.prepare(`
    insert into items (
      id, title, type, notes_markdown, state, mastery, should_review_again, review_interval_days,
      next_review_at, last_reviewed_at, tags_json, links_json, deleted_at, platform, problem_link,
      problem_slug, difficulty, pattern, attempt_count, time_spent_minutes, confidence, last_attempted_at,
      leetcode_outcome, last_solved_at, solution_summary_markdown, system_topic, system_scale_notes,
      problem_statement, functional_requirements, non_functional_requirements, capacity_estimates,
      api_contracts, data_model_notes, architecture_notes, component_deep_dives, scaling_strategy,
      consistency_tradeoffs, caching_strategy, failure_modes_recovery, observability, security_privacy,
      cost_considerations, alternatives_tradeoffs, what_i_missed, follow_up_topics, metadata_json,
      canonical_key, owner_user_id, is_shared, created_at, updated_at
    ) values (
      @id, @title, @type, @notes_markdown, @state, @mastery, @should_review_again, @review_interval_days,
      @next_review_at, @last_reviewed_at, @tags_json, @links_json, @deleted_at, @platform, @problem_link,
      @problem_slug, @difficulty, @pattern, @attempt_count, @time_spent_minutes, @confidence, @last_attempted_at,
      @leetcode_outcome, @last_solved_at, @solution_summary_markdown, @system_topic, @system_scale_notes,
      @problem_statement, @functional_requirements, @non_functional_requirements, @capacity_estimates,
      @api_contracts, @data_model_notes, @architecture_notes, @component_deep_dives, @scaling_strategy,
      @consistency_tradeoffs, @caching_strategy, @failure_modes_recovery, @observability, @security_privacy,
      @cost_considerations, @alternatives_tradeoffs, @what_i_missed, @follow_up_topics, @metadata_json,
      @canonical_key, @owner_user_id, @is_shared, @created_at, @updated_at
    )
  `);

  const insertReviewLog = db.prepare(`
    insert into review_logs (
      id, item_id, goal_id, outcome, quality, notes_markdown,
      previous_review_at, next_review_at, interval_before, interval_after, created_at
    ) values (
      @id, @item_id, @goal_id, @outcome, @quality, @notes_markdown,
      @previous_review_at, @next_review_at, @interval_before, @interval_after, @created_at
    )
  `);

  const insertChangeLog = db.prepare(`
    insert into change_logs (id, item_id, action, details_json, created_at)
    values (@id, @item_id, @action, @details_json, @created_at)
  `);

  const insertItemDoc = db.prepare(`
    insert into item_docs (item_id, content_markdown, checksum, updated_at)
    values (@item_id, @content_markdown, @checksum, @updated_at)
  `);

  const insertGoal = db.prepare(`
    insert into goals (
      id, name, description, start_date, end_date, leetcode_target,
      system_design_target, daily_minutes_target, status, created_at, updated_at
    ) values (
      @id, @name, @description, @start_date, @end_date, @leetcode_target,
      @system_design_target, @daily_minutes_target, @status, @created_at, @updated_at
    )
  `);

  const insertGoalItem = db.prepare(`
    insert into goal_items (goal_id, item_id, module_kind, selected_at)
    values (@goal_id, @item_id, @module_kind, @selected_at)
  `);

  const insertGoalDay = db.prepare(`
    insert into goal_days (
      id, goal_id, date, status, planned_minutes, actual_minutes, notes, created_at, updated_at
    ) values (
      @id, @goal_id, @date, @status, @planned_minutes, @actual_minutes, @notes, @created_at, @updated_at
    )
  `);

  const insertGoalDayEntry = db.prepare(`
    insert into goal_day_entries (
      id, goal_day_id, goal_id, item_id, item_type, entry_type, created_at
    ) values (
      @id, @goal_day_id, @goal_id, @item_id, @item_type, @entry_type, @created_at
    )
  `);

  const insertGoalTarget = db.prepare(`
    insert into goal_targets (
      goal_id, module_kind, dimension, bucket_key, target_count, created_at, updated_at
    ) values (
      @goal_id, @module_kind, @dimension, @bucket_key, @target_count, @created_at, @updated_at
    )
  `);

  const insertGoalSession = db.prepare(`
    insert into goal_sessions (
      id, goal_id, item_id, module_kind, action, session_at, minutes_spent,
      notes_markdown, created_at, updated_at
    ) values (
      @id, @goal_id, @item_id, @module_kind, @action, @session_at, @minutes_spent,
      @notes_markdown, @created_at, @updated_at
    )
  `);

  const restore = db.transaction(() => {
    for (const ci of contentItems) {
      const payload = ci.payload_json && typeof ci.payload_json === "object" && !Array.isArray(ci.payload_json) ? ci.payload_json : {};
      const userState = stateByItemId.get(ci.id);
      const links = normalizeLinks(linksByItemId.get(ci.id) ?? payload.links ?? []);
      const metadata = mergeMetadata(payload, userState);

      insertItem.run({
        id: ci.id,
        title: ci.title ?? payload.title ?? "Untitled",
        type: ci.type ?? payload.type ?? "NOTE",
        notes_markdown: userState?.notes_markdown ?? payload.notesMarkdown ?? "",
        state: userState?.state ?? payload.state ?? "ACTIVE",
        mastery: userState?.mastery ?? payload.mastery ?? "MEDIUM",
        should_review_again: (userState?.should_review_again ?? payload.shouldReviewAgain ?? true) ? 1 : 0,
        review_interval_days: Number(userState?.review_interval_days ?? payload.reviewIntervalDays ?? 7) || 7,
        next_review_at: iso(userState?.next_review_at ?? payload.nextReviewAt),
        last_reviewed_at: iso(userState?.last_reviewed_at ?? payload.lastReviewedAt),
        tags_json: json(ci.tags_json ?? payload.tags ?? [], []),
        links_json: json(links, []),
        deleted_at: iso(userState?.deleted_at ?? ci.deleted_at ?? payload.deletedAt),
        platform: payload.platform ?? null,
        problem_link: payload.problemLink ?? null,
        problem_slug: payload.problemSlug ?? null,
        difficulty: payload.difficulty ?? payload?.metadata?.difficulty ?? null,
        pattern: payload.pattern ?? null,
        attempt_count: userState?.attempt_count ?? payload.attemptCount ?? null,
        time_spent_minutes: userState?.time_spent_minutes ?? payload.timeSpentMinutes ?? null,
        confidence: userState?.confidence ?? payload.confidence ?? null,
        last_attempted_at: iso(userState?.last_attempted_at ?? payload.lastAttemptedAt),
        leetcode_outcome: userState?.leetcode_outcome ?? payload.leetcodeOutcome ?? null,
        last_solved_at: iso(userState?.last_solved_at ?? payload.lastSolvedAt),
        solution_summary_markdown: userState?.solution_summary_markdown ?? payload.solutionSummaryMarkdown ?? null,
        system_topic: payload.systemTopic ?? null,
        system_scale_notes: payload.systemScaleNotes ?? null,
        problem_statement: payload.problemStatement ?? null,
        functional_requirements: payload.functionalRequirements ?? null,
        non_functional_requirements: payload.nonFunctionalRequirements ?? null,
        capacity_estimates: payload.capacityEstimates ?? null,
        api_contracts: payload.apiContracts ?? null,
        data_model_notes: payload.dataModelNotes ?? null,
        architecture_notes: payload.architectureNotes ?? null,
        component_deep_dives: payload.componentDeepDives ?? null,
        scaling_strategy: payload.scalingStrategy ?? null,
        consistency_tradeoffs: payload.consistencyTradeoffs ?? null,
        caching_strategy: payload.cachingStrategy ?? null,
        failure_modes_recovery: payload.failureModesRecovery ?? null,
        observability: payload.observability ?? null,
        security_privacy: payload.securityPrivacy ?? null,
        cost_considerations: payload.costConsiderations ?? null,
        alternatives_tradeoffs: payload.alternativesTradeoffs ?? null,
        what_i_missed: payload.whatIMissed ?? null,
        follow_up_topics: payload.followUpTopics ?? null,
        metadata_json: json(metadata, {}),
        canonical_key: ci.canonical_key ?? payload.canonicalKey ?? null,
        owner_user_id: ci.owner_user_id ?? null,
        is_shared: ci.is_shared ? 1 : 0,
        created_at: iso(ci.created_at ?? payload.createdAt) ?? new Date().toISOString(),
        updated_at: iso(userState?.updated_at ?? ci.updated_at ?? payload.updatedAt) ?? new Date().toISOString(),
      });
    }

    for (const row of reviewLogs) {
      insertReviewLog.run({
        id: row.id,
        item_id: row.content_item_id,
        goal_id: row.goal_id ?? null,
        outcome: row.outcome,
        quality: row.quality,
        notes_markdown: row.notes_markdown ?? "",
        previous_review_at: iso(row.previous_review_at),
        next_review_at: iso(row.next_review_at) ?? new Date().toISOString(),
        interval_before: row.interval_before,
        interval_after: row.interval_after,
        created_at: iso(row.created_at) ?? new Date().toISOString(),
      });
    }

    for (const row of changeLogs) {
      insertChangeLog.run({
        id: row.id,
        item_id: row.content_item_id ?? null,
        action: row.action,
        details_json: json(row.details_json ?? {}, {}),
        created_at: iso(row.created_at) ?? new Date().toISOString(),
      });
    }

    for (const row of itemDocs) {
      insertItemDoc.run({
        item_id: row.content_item_id,
        content_markdown: row.content_markdown ?? "",
        checksum: row.checksum ?? "",
        updated_at: iso(row.updated_at) ?? new Date().toISOString(),
      });
    }

    for (const row of goals) {
      insertGoal.run({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        start_date: row.start_date,
        end_date: row.end_date,
        leetcode_target: row.leetcode_target ?? 0,
        system_design_target: row.system_design_target ?? 0,
        daily_minutes_target: row.daily_minutes_target ?? 120,
        status: row.status ?? "ACTIVE",
        created_at: iso(row.created_at) ?? new Date().toISOString(),
        updated_at: iso(row.updated_at) ?? new Date().toISOString(),
      });
    }

    for (const row of goalItems) {
      insertGoalItem.run({
        goal_id: row.goal_id,
        item_id: row.content_item_id,
        module_kind: row.module_kind,
        selected_at: iso(row.selected_at) ?? new Date().toISOString(),
      });
    }

    for (const row of goalDays) {
      insertGoalDay.run({
        id: row.id,
        goal_id: row.goal_id,
        date: row.date,
        status: row.status ?? "NOT_STARTED",
        planned_minutes: row.planned_minutes ?? 0,
        actual_minutes: row.actual_minutes ?? 0,
        notes: row.notes ?? "",
        created_at: iso(row.created_at) ?? new Date().toISOString(),
        updated_at: iso(row.updated_at) ?? new Date().toISOString(),
      });
    }

    for (const row of goalDayEntries) {
      insertGoalDayEntry.run({
        id: row.id,
        goal_day_id: row.goal_day_id,
        goal_id: row.goal_id,
        item_id: row.content_item_id,
        item_type: row.item_type,
        entry_type: row.entry_type,
        created_at: iso(row.created_at) ?? new Date().toISOString(),
      });
    }

    for (const row of goalTargets) {
      insertGoalTarget.run({
        goal_id: row.goal_id,
        module_kind: row.module_kind,
        dimension: row.dimension,
        bucket_key: row.bucket_key,
        target_count: row.target_count ?? 0,
        created_at: iso(row.created_at) ?? new Date().toISOString(),
        updated_at: iso(row.updated_at) ?? new Date().toISOString(),
      });
    }

    for (const row of goalSessions) {
      insertGoalSession.run({
        id: row.id,
        goal_id: row.goal_id,
        item_id: row.content_item_id,
        module_kind: row.module_kind,
        action: row.action,
        session_at: iso(row.session_at) ?? new Date().toISOString(),
        minutes_spent: row.minutes_spent ?? 0,
        notes_markdown: row.notes_markdown ?? "",
        created_at: iso(row.created_at) ?? new Date().toISOString(),
        updated_at: iso(row.updated_at) ?? new Date().toISOString(),
      });
    }
  });

  restore();
  db.close();

  console.log("Recovered data into local SQLite:");
  console.log(`- items: ${contentItems.length}`);
  console.log(`- review logs: ${reviewLogs.length}`);
  console.log(`- change logs: ${changeLogs.length}`);
  console.log(`- docs: ${itemDocs.length}`);
  console.log(`- goals: ${goals.length}`);
  console.log(`- goal items: ${goalItems.length}`);
  console.log(`- goal days: ${goalDays.length}`);
  console.log(`- goal day entries: ${goalDayEntries.length}`);
  console.log(`- goal targets: ${goalTargets.length}`);
  console.log(`- goal sessions: ${goalSessions.length}`);
  console.log(`SQLite DB written to ${sqlitePath}`);
}

main();
