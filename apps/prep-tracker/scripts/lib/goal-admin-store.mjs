import { randomUUID } from "node:crypto";
import { ensureUserByEmail, getSql } from "./shared-content-store.mjs";

function buildDateRange(startDate, endDate) {
  const dates = [];
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

export async function requireSeedUser() {
  const email = process.env.SEED_USER_EMAIL ?? process.env.MIGRATION_BOOTSTRAP_EMAIL;
  if (!email) {
    throw new Error("Set SEED_USER_EMAIL (or MIGRATION_BOOTSTRAP_EMAIL) before running goal seed scripts.");
  }

  return ensureUserByEmail({
    email,
    password: process.env.SEED_USER_PASSWORD ?? process.env.MIGRATION_BOOTSTRAP_PASSWORD,
    displayName: process.env.SEED_USER_NAME ?? process.env.MIGRATION_BOOTSTRAP_NAME,
  });
}

async function syncGoalDays(goal) {
  const sql = getSql();
  const dates = buildDateRange(goal.start_date, goal.end_date);
  const existing = await sql`
    select id, date::text
    from public.goal_days
    where goal_id = ${goal.id}
  `;
  const existingByDate = new Map(existing.map((row) => [row.date, row.id]));

  for (const date of dates) {
    if (!existingByDate.has(date)) {
      await sql`
        insert into public.goal_days (id, goal_id, date, status, planned_minutes, actual_minutes, notes)
        values (${randomUUID()}, ${goal.id}, ${date}, 'NOT_STARTED', ${goal.daily_minutes_target}, 0, '')
      `;
    }
  }
}

export async function listGoalsForSeedUser() {
  const user = await requireSeedUser();
  const sql = getSql();
  return sql`
    select *
    from public.goals
    where user_id = ${user.id}
    order by created_at asc
  `;
}

export async function getGoalByNameForSeedUser(goalName) {
  const goals = await listGoalsForSeedUser();
  return goals.find((goal) => goal.name === goalName) ?? null;
}

export async function createGoalForSeedUser(input) {
  const user = await requireSeedUser();
  const sql = getSql();
  const id = input.id ?? randomUUID();
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
      ${id},
      ${user.id},
      ${input.name},
      ${input.description ?? ""},
      ${input.startDate},
      ${input.endDate},
      ${Number(input.leetcodeTarget ?? 0)},
      ${Number(input.systemDesignTarget ?? 0)},
      ${Number(input.dailyMinutesTarget ?? 0)},
      ${input.status ?? "ACTIVE"}
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      leetcode_target = excluded.leetcode_target,
      system_design_target = excluded.system_design_target,
      daily_minutes_target = excluded.daily_minutes_target,
      status = excluded.status
  `;

  const [goal] = await sql`
    select *
    from public.goals
    where id = ${id}
      and user_id = ${user.id}
    limit 1
  `;
  await syncGoalDays(goal);
  return goal;
}

export async function updateGoalForSeedUser(goalId, input) {
  const user = await requireSeedUser();
  const sql = getSql();
  await sql`
    update public.goals
    set
      name = coalesce(${input.name ?? null}, name),
      description = coalesce(${input.description ?? null}, description),
      start_date = coalesce(${input.startDate ?? null}, start_date),
      end_date = coalesce(${input.endDate ?? null}, end_date),
      leetcode_target = coalesce(${input.leetcodeTarget ?? null}, leetcode_target),
      system_design_target = coalesce(${input.systemDesignTarget ?? null}, system_design_target),
      daily_minutes_target = coalesce(${input.dailyMinutesTarget ?? null}, daily_minutes_target),
      status = coalesce(${input.status ?? null}, status),
      updated_at = ${new Date().toISOString()}
    where id = ${goalId}
      and user_id = ${user.id}
  `;
  const [goal] = await sql`
    select *
    from public.goals
    where id = ${goalId}
      and user_id = ${user.id}
    limit 1
  `;
  if (goal) {
    await syncGoalDays(goal);
  }
  return goal ?? null;
}

export async function deleteGoalForSeedUser(goalId) {
  const user = await requireSeedUser();
  const sql = getSql();
  const result = await sql`
    delete from public.goals
    where id = ${goalId}
      and user_id = ${user.id}
  `;
  return result.count > 0;
}

export async function addGoalItemForSeedUser(goalId, itemId, moduleKind) {
  const sql = getSql();
  await sql`
    insert into public.goal_items (goal_id, content_item_id, module_kind, selected_at)
    values (${goalId}, ${itemId}, ${moduleKind}, ${new Date().toISOString()})
    on conflict (goal_id, content_item_id) do nothing
  `;
  return { ok: true };
}

export async function listGoalDaysForSeedUser(goalId) {
  const user = await requireSeedUser();
  const sql = getSql();
  const [goal] = await sql`
    select id
    from public.goals
    where id = ${goalId}
      and user_id = ${user.id}
    limit 1
  `;
  if (!goal) return [];
  return sql`
    select *
    from public.goal_days
    where goal_id = ${goalId}
    order by date asc
  `;
}

export async function updateGoalDayForSeedUser(dayId, input) {
  const sql = getSql();
  await sql`
    update public.goal_days
    set
      status = coalesce(${input.status ?? null}, status),
      planned_minutes = coalesce(${input.plannedMinutes ?? null}, planned_minutes),
      actual_minutes = coalesce(${input.actualMinutes ?? null}, actual_minutes),
      notes = coalesce(${input.notes ?? null}, notes),
      updated_at = ${new Date().toISOString()}
    where id = ${dayId}
  `;
  const [day] = await sql`
    select *
    from public.goal_days
    where id = ${dayId}
    limit 1
  `;
  return day ?? null;
}

export async function replaceGoalTargetsForSeedUser(goalId, input) {
  const sql = getSql();
  await sql`
    delete from public.goal_targets
    where goal_id = ${goalId}
      and module_kind = ${input.moduleKind}
      and dimension = ${input.dimension}
  `;

  for (const target of input.targets ?? []) {
    await sql`
      insert into public.goal_targets (goal_id, module_kind, dimension, bucket_key, target_count)
      values (${goalId}, ${input.moduleKind}, ${input.dimension}, ${target.bucketKey}, ${Number(target.targetCount ?? 0)})
    `;
  }

  return { ok: true };
}
