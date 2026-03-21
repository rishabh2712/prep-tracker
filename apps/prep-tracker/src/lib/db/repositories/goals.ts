import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { getSql } from "@/lib/db/sql";
import type {
  GoalItemRecord,
  GoalProgress,
  GoalSessionRecord,
} from "@/lib/types";
import type {
  GoalCreateInput,
  GoalDayUpdateInput,
  GoalSessionCreateInput,
  GoalTargetDeleteInput,
  GoalTargetReplaceInput,
  GoalTargetUpsertInput,
  GoalUpdateInput,
} from "@/lib/validators";
import type {
  GoalDayEntryRow,
  GoalDayRow,
  GoalItemRow,
  GoalRow,
  GoalSessionRow,
  GoalTargetRow,
} from "@/lib/db/types";
import {
  applyGoalSessionItemUpdates,
  computeGoalTargetCoverage,
  computeProgressSnapshot,
  guessModuleKind,
  mapGoalDayEntryRow,
  mapGoalDayRow,
  mapGoalRow,
  mapGoalSessionRow,
  mapGoalTargetRow,
} from "@/lib/db/prep-items";
import { addReviewForItem, getAccessibleItem, getAccessibleItemsByIds, updateAccessibleItem } from "@/lib/db/repositories/items";

function asSql(tx: TransactionSql<Record<string, never>>): Sql {
  return tx as unknown as Sql;
}

function buildDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return dates;
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (dates.length > 500) break;
  }
  return dates;
}

async function syncGoalDays(goal: { id: string; dailyMinutesTarget: number; startDate: string; endDate: string }) {
  const sql = getSql();
  const dates = buildDateRange(goal.startDate, goal.endDate);
  const existing = await sql<{ id: string; date: string }[]>`
    select id, date::text
    from public.goal_days
    where goal_id = ${goal.id}
  `;
  const existingByDate = new Map(existing.map((row) => [row.date, row]));

  for (const date of dates) {
    if (!existingByDate.has(date)) {
      await sql`
        insert into public.goal_days (id, goal_id, date, status, planned_minutes, actual_minutes, notes)
        values (${randomUUID()}, ${goal.id}, ${date}, 'NOT_STARTED', ${goal.dailyMinutesTarget}, 0, '')
      `;
    }
  }

  const validDates = new Set(dates);
  for (const row of existing) {
    if (!validDates.has(row.date)) {
      await sql`delete from public.goal_days where goal_id = ${goal.id} and date = ${row.date}`;
    }
  }
}

export async function listGoalRecordsForUser(userId: string) {
  const sql = getSql();
  const rows = await sql<GoalRow[]>`
    select *
    from public.goals
    where user_id = ${userId}
    order by updated_at desc, created_at desc
  `;
  return rows.map(mapGoalRow);
}

export async function getGoalRecordForUser(userId: string, goalId: string) {
  const sql = getSql();
  const [row] = await sql<GoalRow[]>`
    select *
    from public.goals
    where user_id = ${userId} and id = ${goalId}
    limit 1
  `;
  return row ? mapGoalRow(row) : null;
}

export async function createGoalRecordForUser(userId: string, input: GoalCreateInput) {
  const sql = getSql();
  const goalId = randomUUID();
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
      status
    )
    values (
      ${goalId},
      ${userId},
      ${input.name.trim()},
      ${input.description ?? ""},
      ${input.startDate},
      ${input.endDate},
      ${input.leetcodeTarget},
      ${input.systemDesignTarget},
      ${input.dailyMinutesTarget},
      ${input.status ?? "ACTIVE"}
    )
  `;

  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) {
    throw new Error("Unable to create goal");
  }
  await syncGoalDays(goal);
  return goal;
}

export async function updateGoalRecordForUser(userId: string, goalId: string, input: GoalUpdateInput) {
  const current = await getGoalRecordForUser(userId, goalId);
  if (!current) return null;
  const sql = getSql();

  await sql`
    update public.goals
    set
      name = ${input.name?.trim() ?? current.name},
      description = ${input.description ?? current.description},
      start_date = ${input.startDate ?? current.startDate},
      end_date = ${input.endDate ?? current.endDate},
      leetcode_target = ${input.leetcodeTarget ?? current.leetcodeTarget},
      system_design_target = ${input.systemDesignTarget ?? current.systemDesignTarget},
      daily_minutes_target = ${input.dailyMinutesTarget ?? current.dailyMinutesTarget},
      status = ${input.status ?? current.status}
    where id = ${goalId} and user_id = ${userId}
  `;

  const updated = await getGoalRecordForUser(userId, goalId);
  if (!updated) return null;
  await syncGoalDays(updated);
  return updated;
}

export async function deleteGoalRecordForUser(userId: string, goalId: string) {
  const sql = getSql();
  const result = await sql`
    delete from public.goals
    where id = ${goalId} and user_id = ${userId}
  `;
  return result.count > 0;
}

export async function listGoalItemsForUser(userId: string, goalId: string): Promise<GoalItemRecord[] | null> {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;
  const sql = getSql();
  const rows = await sql<GoalItemRow[]>`
    select *
    from public.goal_items
    where goal_id = ${goalId}
    order by selected_at asc
  `;
  const items = await getAccessibleItemsByIds(
    userId,
    rows.map((row) => row.content_item_id)
  );
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return rows
    .map((row) => {
      const item = itemsById.get(row.content_item_id);
      if (!item) return null;
      return {
        goalId: row.goal_id,
        itemId: row.content_item_id,
        moduleKind: row.module_kind,
        selectedAt: row.selected_at,
        item,
      } satisfies GoalItemRecord;
    })
    .filter((entry): entry is GoalItemRecord => Boolean(entry));
}

export async function addItemToGoalForUser(userId: string, goalId: string, itemId: string) {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;
  const item = await getAccessibleItem(userId, itemId);
  if (!item || item.deletedAt) return null;

  const sql = getSql();
  await sql`
    insert into public.goal_items (goal_id, content_item_id, module_kind, selected_at)
    values (${goalId}, ${itemId}, ${guessModuleKind(item)}, ${new Date().toISOString()})
    on conflict (goal_id, content_item_id) do nothing
  `;
  return await listGoalItemsForUser(userId, goalId);
}

export async function removeItemFromGoalForUser(userId: string, goalId: string, itemId: string) {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;
  const sql = getSql();
  await sql`
    delete from public.goal_items
    where goal_id = ${goalId}
      and content_item_id = ${itemId}
  `;
  return await listGoalItemsForUser(userId, goalId);
}

export async function listGoalTargetsForUser(userId: string, goalId: string) {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;
  const sql = getSql();
  const rows = await sql<GoalTargetRow[]>`
    select *
    from public.goal_targets
    where goal_id = ${goalId}
    order by module_kind asc, dimension asc, bucket_key asc
  `;
  return rows.map(mapGoalTargetRow);
}

export async function upsertGoalTargetForUser(userId: string, goalId: string, input: GoalTargetUpsertInput) {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;
  const sql = getSql();
  await sql`
    insert into public.goal_targets (goal_id, module_kind, dimension, bucket_key, target_count)
    values (${goalId}, ${input.moduleKind}, ${input.dimension}, ${input.bucketKey.trim()}, ${input.targetCount})
    on conflict (goal_id, module_kind, dimension, bucket_key) do update set
      target_count = excluded.target_count
  `;
  return await listGoalTargetsForUser(userId, goalId);
}

export async function replaceGoalTargetsForUser(userId: string, goalId: string, input: GoalTargetReplaceInput) {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;
  const sql = getSql();
  await sql.begin(async (tx: TransactionSql<Record<string, never>>) => {
    const txSql = asSql(tx);
    await txSql`
      delete from public.goal_targets
      where goal_id = ${goalId}
        and module_kind = ${input.moduleKind}
        and dimension = ${input.dimension}
    `;
    for (const target of input.targets) {
      await txSql`
        insert into public.goal_targets (goal_id, module_kind, dimension, bucket_key, target_count)
        values (${goalId}, ${input.moduleKind}, ${input.dimension}, ${target.bucketKey.trim()}, ${target.targetCount})
      `;
    }
  });
  return await listGoalTargetsForUser(userId, goalId);
}

export async function deleteGoalTargetForUser(userId: string, goalId: string, input: GoalTargetDeleteInput) {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return false;
  const sql = getSql();
  const result = await sql`
    delete from public.goal_targets
    where goal_id = ${goalId}
      and module_kind = ${input.moduleKind}
      and dimension = ${input.dimension}
      and bucket_key = ${input.bucketKey.trim()}
  `;
  return result.count > 0;
}

export async function createGoalSessionForUser(userId: string, goalId: string, input: GoalSessionCreateInput): Promise<GoalSessionRecord | null> {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;
  const item = await getAccessibleItem(userId, input.itemId);
  if (!item || item.deletedAt) return null;
  if ((input.moduleKind === "LEETCODE" && item.type !== "LEETCODE") || (input.moduleKind === "SYSTEM_DESIGN" && item.type !== "SYSTEM_DESIGN")) {
    return null;
  }

  if (input.moduleKind === "LEETCODE" && input.action === "SYSTEM_DESIGN_READ") return null;
  if (input.moduleKind === "SYSTEM_DESIGN" && input.action === "LEETCODE_SOLVED") return null;

  const sql = getSql();
  await sql`
    insert into public.goal_items (goal_id, content_item_id, module_kind, selected_at)
    values (${goalId}, ${item.id}, ${input.moduleKind}, ${new Date().toISOString()})
    on conflict (goal_id, content_item_id) do nothing
  `;

  const now = new Date().toISOString();
  const sessionAt = input.sessionAt ?? now;
  const sessionId = randomUUID();
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
      ${sessionId},
      ${goalId},
      ${item.id},
      ${input.moduleKind},
      ${input.action},
      ${sessionAt},
      ${Math.max(0, input.minutesSpent ?? 0)},
      ${input.notesMarkdown ?? ""},
      ${now},
      ${now}
    )
  `;

  const nextItem = applyGoalSessionItemUpdates({ ...item }, input, now, sessionAt);
  await updateAccessibleItem(userId, item.id, {
    state: nextItem.state,
    shouldReviewAgain: nextItem.shouldReviewAgain,
    nextReviewAt: nextItem.nextReviewAt,
    lastAttemptedAt: nextItem.lastAttemptedAt,
    lastSolvedAt: nextItem.lastSolvedAt,
    leetcodeOutcome: nextItem.leetcodeOutcome,
    attemptCount: nextItem.attemptCount,
    timeSpentMinutes: nextItem.timeSpentMinutes,
  });

  if (input.action === "REVIEW" && input.reviewOutcome) {
    await addReviewForItem(userId, item.id, { outcome: input.reviewOutcome, notesMarkdown: input.notesMarkdown ?? "", goalId }, goalId);
  }

  const sessions = await listGoalSessionsForUser(userId, goalId, 50);
  return sessions?.find((session) => session.id === sessionId) ?? null;
}

export async function listGoalSessionsForUser(userId: string, goalId: string, limit = 30) {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;
  const sql = getSql();
  const rows = await sql<GoalSessionRow[]>`
    select *
    from public.goal_sessions
    where goal_id = ${goalId}
    order by session_at desc, created_at desc
    limit ${Math.max(1, limit)}
  `;
  const items = await getAccessibleItemsByIds(
    userId,
    rows.map((row) => row.content_item_id)
  );
  const itemsById = new Map(items.map((item) => [item.id, item]));
  return rows.map((row) => mapGoalSessionRow(row, itemsById.get(row.content_item_id)?.title ?? "Unknown item"));
}

export async function deleteGoalSessionForUser(userId: string, goalId: string, sessionId: string) {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return false;
  const sql = getSql();
  const result = await sql`
    delete from public.goal_sessions
    where goal_id = ${goalId}
      and id = ${sessionId}
  `;
  return result.count > 0;
}

export async function listGoalDaysForUser(userId: string, goalId: string) {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;
  const sql = getSql();
  const dayRows = await sql<GoalDayRow[]>`
    select *
    from public.goal_days
    where goal_id = ${goalId}
    order by date asc
  `;
  const entryRows = await sql<GoalDayEntryRow[]>`
    select *
    from public.goal_day_entries
    where goal_id = ${goalId}
    order by created_at asc
  `;
  const items = await getAccessibleItemsByIds(
    userId,
    entryRows.map((row) => row.content_item_id)
  );
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const entriesByDay = new Map<string, ReturnType<typeof mapGoalDayEntryRow>[]>();
  for (const row of entryRows) {
    const list = entriesByDay.get(row.goal_day_id) ?? [];
    list.push(mapGoalDayEntryRow(row, itemsById.get(row.content_item_id)?.title ?? "Unknown item"));
    entriesByDay.set(row.goal_day_id, list);
  }

  return dayRows.map((row) => mapGoalDayRow(row, entriesByDay.get(row.id) ?? []));
}

export async function updateGoalDayForUser(userId: string, dayId: string, input: GoalDayUpdateInput) {
  const sql = getSql();
  const [row] = await sql<GoalDayRow[]>`
    select gd.*
    from public.goal_days gd
    join public.goals g on g.id = gd.goal_id
    where gd.id = ${dayId}
      and g.user_id = ${userId}
    limit 1
  `;
  if (!row) return null;

  await sql`
    update public.goal_days
    set
      status = ${input.status ?? row.status},
      planned_minutes = ${input.plannedMinutes ?? row.planned_minutes},
      actual_minutes = ${input.actualMinutes ?? row.actual_minutes},
      notes = ${input.notes ?? row.notes}
    where id = ${dayId}
  `;

  const days = await listGoalDaysForUser(userId, row.goal_id);
  return days?.find((day) => day.id === dayId) ?? null;
}

export async function addGoalDayEntryForUser(userId: string, dayId: string, input: { itemId: string; entryType: "LEETCODE_SOLVED" | "SYSTEM_DESIGN_READ" }) {
  const sql = getSql();
  const [day] = await sql<GoalDayRow[]>`
    select gd.*
    from public.goal_days gd
    join public.goals g on g.id = gd.goal_id
    where gd.id = ${dayId}
      and g.user_id = ${userId}
    limit 1
  `;
  if (!day) return null;

  const item = await getAccessibleItem(userId, input.itemId);
  if (!item || item.deletedAt) return null;
  if (input.entryType === "LEETCODE_SOLVED" && item.type !== "LEETCODE") return null;
  if (input.entryType === "SYSTEM_DESIGN_READ" && item.type !== "SYSTEM_DESIGN") return null;

  await sql`
    insert into public.goal_items (goal_id, content_item_id, module_kind, selected_at)
    values (${day.goal_id}, ${item.id}, ${guessModuleKind(item)}, ${new Date().toISOString()})
    on conflict (goal_id, content_item_id) do nothing
  `;

  await sql`
    insert into public.goal_day_entries (id, goal_day_id, goal_id, content_item_id, item_type, entry_type, created_at)
    values (${randomUUID()}, ${day.id}, ${day.goal_id}, ${item.id}, ${guessModuleKind(item)}, ${input.entryType}, ${new Date().toISOString()})
    on conflict (goal_day_id, content_item_id, entry_type) do nothing
  `;

  if (input.entryType === "LEETCODE_SOLVED") {
    const timestamp = `${day.date}T00:00:00.000Z`;
    await updateAccessibleItem(userId, item.id, {
      attemptCount: (item.attemptCount ?? 0) + 1,
      lastAttemptedAt: timestamp,
      lastSolvedAt: timestamp,
      leetcodeOutcome: "SOLVED",
    });
  }

  return {
    dayId,
    entries: (await listGoalDaysForUser(userId, day.goal_id))?.find((entry) => entry.id === dayId)?.entries ?? [],
  };
}

export async function removeGoalDayEntryForUser(userId: string, dayId: string, entryId: string) {
  const sql = getSql();
  const [day] = await sql<{ goal_id: string }[]>`
    select gd.goal_id
    from public.goal_days gd
    join public.goals g on g.id = gd.goal_id
    where gd.id = ${dayId}
      and g.user_id = ${userId}
    limit 1
  `;
  if (!day) return null;

  const result = await sql`
    delete from public.goal_day_entries
    where id = ${entryId}
      and goal_day_id = ${dayId}
  `;
  if (result.count === 0) return null;

  return {
    dayId,
    entries: (await listGoalDaysForUser(userId, day.goal_id))?.find((entry) => entry.id === dayId)?.entries ?? [],
  };
}

export async function getGoalProgressForUser(userId: string, goalId: string): Promise<GoalProgress | null> {
  const goal = await getGoalRecordForUser(userId, goalId);
  if (!goal) return null;

  const selections = (await listGoalItemsForUser(userId, goalId)) ?? [];
  const selectedLeetcode = selections.filter((entry) => entry.moduleKind === "LEETCODE");
  const selectedSystem = selections.filter((entry) => entry.moduleKind === "SYSTEM_DESIGN");

  const doneLeetcode = selectedLeetcode.filter((entry) => entry.item.leetcodeOutcome === "SOLVED").length;
  const doneSystem = selectedSystem.filter((entry) => entry.item.state === "DONE").length;

  const selectedItems = selections.map((entry) => entry.item);
  const progress = computeProgressSnapshot(selectedItems, {
    leetcodeTarget: goal.leetcodeTarget,
    systemDesignTarget: goal.systemDesignTarget,
    targetDate: goal.endDate,
    updatedAt: goal.updatedAt,
  });

  const dueReviews = selectedItems
    .filter((item) => item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now())
    .sort((a, b) => (a.nextReviewAt ?? "").localeCompare(b.nextReviewAt ?? ""))
    .slice(0, 20)
    .map((item) => ({
      itemId: item.id,
      title: item.title,
      moduleKind: guessModuleKind(item),
      dueAt: item.nextReviewAt!,
    }));

  const targets = (await listGoalTargetsForUser(userId, goalId)) ?? [];

  return {
    goal,
    selected: {
      leetcode: selectedLeetcode.length,
      systemDesign: selectedSystem.length,
      total: selections.length,
    },
    done: {
      leetcode: doneLeetcode,
      systemDesign: doneSystem,
      total: doneLeetcode + doneSystem,
    },
    targets: {
      leetcode: goal.leetcodeTarget,
      systemDesign: goal.systemDesignTarget,
      total: goal.leetcodeTarget + goal.systemDesignTarget,
    },
    dueReviews,
    targetCoverage: computeGoalTargetCoverage(targets, selectedLeetcode, selectedSystem),
    sessionsSummary: {
      totalSessions: ((await listGoalSessionsForUser(userId, goalId, 1000)) ?? []).length,
      totalMinutes: ((await listGoalSessionsForUser(userId, goalId, 1000)) ?? []).reduce((sum, row) => sum + row.minutesSpent, 0),
      last7dSessions: ((await listGoalSessionsForUser(userId, goalId, 1000)) ?? []).filter((row) => new Date(row.sessionAt).getTime() >= Date.now() - 7 * 86400000).length,
      last7dMinutes: ((await listGoalSessionsForUser(userId, goalId, 1000)) ?? [])
        .filter((row) => new Date(row.sessionAt).getTime() >= Date.now() - 7 * 86400000)
        .reduce((sum, row) => sum + row.minutesSpent, 0),
      lastActivityAt: ((await listGoalSessionsForUser(userId, goalId, 1)) ?? [])[0]?.sessionAt ?? null,
    },
    progress,
  };
}
