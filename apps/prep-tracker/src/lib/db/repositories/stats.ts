import { getSql } from "@/lib/db/sql";
import type { ChangeLog } from "@/lib/types";
import { computeProgressSnapshot, mapChangeRow } from "@/lib/db/prep-items";
import { listAccessibleItems } from "@/lib/db/repositories/items";
import { getLegacyGoalsForUser } from "@/lib/db/repositories/goals";
import type { UserChangeLogRow, UserReviewLogRow } from "@/lib/db/types";

export async function getStatsForUser(userId: string) {
  const sql = getSql();
  const items = await listAccessibleItems(userId, { type: "ALL", includeDeleted: false });
  const goals = await getLegacyGoalsForUser(userId);
  const progress = computeProgressSnapshot(items, goals);

  const due = items.filter((item) => item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now());
  const now = new Date();
  const dueToday = due.filter((item) => {
    if (!item.nextReviewAt) return false;
    const d = new Date(item.nextReviewAt);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
  });

  const recentReviews = await sql<UserReviewLogRow[]>`
    select *
    from public.user_review_logs
    where user_id = ${userId}
    order by created_at desc
    limit 10
  `;

  return {
    totalItems: items.length,
    totalDue: due.length,
    dueToday: dueToday.length,
    solvedLeetcode: items.filter((item) => item.type === "LEETCODE" && item.leetcodeOutcome === "SOLVED").length,
    byType: items.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {}),
    recentReviews: recentReviews.map((row) => ({
      id: row.id,
      itemId: row.content_item_id,
      outcome: row.outcome,
      createdAt: row.created_at,
    })),
    goals,
    progress,
  };
}

export async function getRecentChangesForUser(userId: string, limit = 20): Promise<ChangeLog[]> {
  const sql = getSql();
  const rows = await sql<UserChangeLogRow[]>`
    select *
    from public.user_change_logs
    where user_id = ${userId}
    order by created_at desc
    limit ${Math.max(1, limit)}
  `;
  return rows.map(mapChangeRow);
}
