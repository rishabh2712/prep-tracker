import { getOptionalServerUser } from "@/lib/auth/server";
import { type SystemDesignMarkdownDoc, getSystemDesignMarkdownForUser, saveSystemDesignMarkdownForUser } from "@/lib/db/repositories/docs";
import {
  addGoalDayEntryForUser,
  addItemToGoalForUser,
  createGoalRecordForUser,
  createGoalSessionForUser,
  deleteGoalRecordForUser,
  deleteGoalSessionForUser,
  deleteGoalTargetForUser,
  getGoalProgressForUser,
  getGoalRecordForUser,
  listGoalDaysForUser,
  listGoalItemsForUser,
  listGoalRecordsForUser,
  listGoalSessionsForUser,
  listGoalTargetsForUser,
  removeGoalDayEntryForUser,
  removeItemFromGoalForUser,
  replaceGoalTargetsForUser,
  updateGoalDayForUser,
  updateGoalRecordForUser,
  upsertGoalTargetForUser,
} from "@/lib/db/repositories/goals";
import {
  addReviewForItem,
  createPrivateItem,
  getAccessibleItem,
  hardDeleteAccessibleItem,
  listAccessibleItems,
  listBankRecords,
  listReviewsForItem,
  restoreAccessibleItem,
  softDeleteAccessibleItem,
  updateAccessibleItem,
} from "@/lib/db/repositories/items";
import { DuplicateItemError, MarkdownConflictError } from "@/lib/db/prep-items";
import type {
  GoalSessionRecord,
  GoalTargetRecord,
} from "@/lib/types";
import type {
  AgentIngestInput,
  GoalCreateInput,
  GoalDayUpdateInput,
  GoalSessionCreateInput,
  GoalTargetDeleteInput,
  GoalTargetReplaceInput,
  GoalTargetUpsertInput,
  GoalUpdateInput,
  ItemCreateInput,
  ItemUpdateInput,
  MarkdownSaveInput,
  ReviewInput,
} from "@/lib/validators";

async function requireUserId() {
  const user = await getOptionalServerUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user.id;
}

export { DuplicateItemError, MarkdownConflictError };
export type { SystemDesignMarkdownDoc };

export async function listItems(params: Parameters<typeof listAccessibleItems>[1]) {
  return listAccessibleItems(await requireUserId(), params);
}

export async function getItem(id: string) {
  return getAccessibleItem(await requireUserId(), id);
}

export async function getReviewsForItem(itemId: string) {
  return listReviewsForItem(await requireUserId(), itemId);
}

export async function createItem(input: ItemCreateInput) {
  return createPrivateItem(await requireUserId(), input);
}

export async function updateItem(id: string, input: ItemUpdateInput) {
  return updateAccessibleItem(await requireUserId(), id, input);
}

export async function softDeleteItem(id: string) {
  return softDeleteAccessibleItem(await requireUserId(), id);
}

export async function restoreItem(id: string) {
  return restoreAccessibleItem(await requireUserId(), id);
}

export async function hardDeleteItem(id: string) {
  return hardDeleteAccessibleItem(await requireUserId(), id);
}

export async function addReview(itemId: string, input: ReviewInput, goalId?: string) {
  return addReviewForItem(await requireUserId(), itemId, input, goalId);
}

export async function listBankItems(kind: "LEETCODE" | "SYSTEM_DESIGN", q?: string) {
  return listBankRecords(await requireUserId(), kind, q);
}

export async function listGoalRecords() {
  return listGoalRecordsForUser(await requireUserId());
}

export async function getGoalRecord(goalId: string) {
  return getGoalRecordForUser(await requireUserId(), goalId);
}

export async function createGoalRecord(input: GoalCreateInput) {
  return createGoalRecordForUser(await requireUserId(), input);
}

export async function updateGoalRecord(goalId: string, input: GoalUpdateInput) {
  return updateGoalRecordForUser(await requireUserId(), goalId, input);
}

export async function deleteGoalRecord(goalId: string) {
  return deleteGoalRecordForUser(await requireUserId(), goalId);
}

export async function listGoalItems(goalId: string) {
  return listGoalItemsForUser(await requireUserId(), goalId);
}

export async function addItemToGoal(goalId: string, itemId: string) {
  return addItemToGoalForUser(await requireUserId(), goalId, itemId);
}

export async function removeItemFromGoal(goalId: string, itemId: string) {
  return removeItemFromGoalForUser(await requireUserId(), goalId, itemId);
}

export async function listGoalTargets(goalId: string): Promise<GoalTargetRecord[] | null> {
  return listGoalTargetsForUser(await requireUserId(), goalId);
}

export async function upsertGoalTarget(goalId: string, input: GoalTargetUpsertInput) {
  return upsertGoalTargetForUser(await requireUserId(), goalId, input);
}

export async function replaceGoalTargets(goalId: string, input: GoalTargetReplaceInput) {
  return replaceGoalTargetsForUser(await requireUserId(), goalId, input);
}

export async function deleteGoalTarget(goalId: string, input: GoalTargetDeleteInput) {
  return deleteGoalTargetForUser(await requireUserId(), goalId, input);
}

export async function createGoalSession(goalId: string, input: GoalSessionCreateInput): Promise<GoalSessionRecord | null> {
  return createGoalSessionForUser(await requireUserId(), goalId, input);
}

export async function listGoalSessions(goalId: string, limit = 30) {
  return listGoalSessionsForUser(await requireUserId(), goalId, limit);
}

export async function deleteGoalSession(goalId: string, sessionId: string) {
  return deleteGoalSessionForUser(await requireUserId(), goalId, sessionId);
}

export async function listGoalDays(goalId: string) {
  return listGoalDaysForUser(await requireUserId(), goalId);
}

export async function updateGoalDay(dayId: string, input: GoalDayUpdateInput) {
  return updateGoalDayForUser(await requireUserId(), dayId, input);
}

export async function addGoalDayEntry(dayId: string, input: { itemId: string; entryType: "LEETCODE_SOLVED" | "SYSTEM_DESIGN_READ" }) {
  return addGoalDayEntryForUser(await requireUserId(), dayId, input);
}

export async function removeGoalDayEntry(dayId: string, entryId: string) {
  return removeGoalDayEntryForUser(await requireUserId(), dayId, entryId);
}

export async function getGoalProgress(goalId: string) {
  return getGoalProgressForUser(await requireUserId(), goalId);
}

export async function getSystemDesignMarkdown(itemId: string): Promise<SystemDesignMarkdownDoc | null> {
  return getSystemDesignMarkdownForUser(await requireUserId(), itemId);
}

export async function saveSystemDesignMarkdown(itemId: string, input: MarkdownSaveInput): Promise<SystemDesignMarkdownDoc | null> {
  return saveSystemDesignMarkdownForUser(await requireUserId(), itemId, input);
}

function inferAutoGoalDates() {
  const startDate = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 44 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { startDate, endDate };
}

export async function ingestAgentContent(input: AgentIngestInput) {
  const userId = await requireUserId();
  let item = await createPrivateItem(userId, {
    title: input.title,
    type: input.type,
    notesMarkdown: input.notesMarkdown ?? "",
    tags: input.tags ?? [],
    links: [],
    problemLink: input.problemLink ?? null,
    problemSlug: input.problemSlug ?? null,
    difficulty: input.difficulty ?? null,
    pattern: input.pattern ?? null,
    platform: input.type === "LEETCODE" ? "LeetCode" : null,
    systemTopic: input.systemTopic ?? null,
    reviewIntervalDays: 7,
    shouldReviewAgain: true,
    nextReviewAt: null,
    metadata: { source: "agent-ingest", ingestedAt: new Date().toISOString() },
    state: "ACTIVE",
    mastery: "MEDIUM",
    attemptCount: null,
    timeSpentMinutes: null,
    confidence: null,
    lastAttemptedAt: null,
    leetcodeOutcome: null,
    lastSolvedAt: null,
    solutionSummaryMarkdown: null,
    systemScaleNotes: null,
    problemStatement: null,
    functionalRequirements: null,
    nonFunctionalRequirements: null,
    capacityEstimates: null,
    apiContracts: null,
    dataModelNotes: null,
    architectureNotes: null,
    componentDeepDives: null,
    scalingStrategy: null,
    consistencyTradeoffs: null,
    cachingStrategy: null,
    failureModesRecovery: null,
    observability: null,
    securityPrivacy: null,
    costConsiderations: null,
    alternativesTradeoffs: null,
    whatIMissed: null,
    followUpTopics: null,
  }).catch(async (error) => {
    if (!(error instanceof DuplicateItemError)) throw error;
    const existing = await getAccessibleItem(userId, error.existingId);
    if (!existing) throw error;
    const updated = await updateAccessibleItem(userId, existing.id, {
      notesMarkdown: input.notesMarkdown ?? existing.notesMarkdown,
      metadata: {
        ...(existing.metadata ?? {}),
        source: "agent-ingest",
        lastIngestedAt: new Date().toISOString(),
      },
      attemptCount: existing.attemptCount,
      timeSpentMinutes: existing.timeSpentMinutes,
    });
    if (!updated) throw error;
    return updated;
  });

  let goal = null;
  if (input.goalName?.trim()) {
    const existingGoals = await listGoalRecordsForUser(userId);
    goal =
      existingGoals.find((entry) => entry.name.trim().toLowerCase() === input.goalName?.trim().toLowerCase()) ??
      (await createGoalRecordForUser(userId, {
        name: input.goalName.trim(),
        description: "Auto-created by agent ingest",
        ...inferAutoGoalDates(),
        leetcodeTarget: 0,
        systemDesignTarget: 0,
        dailyMinutesTarget: 120,
        status: "ACTIVE",
      }));
    await addItemToGoalForUser(userId, goal.id, item.id);
  }

  let markdown: SystemDesignMarkdownDoc | null = null;
  if (item.type === "SYSTEM_DESIGN" && typeof input.markdownContent === "string") {
    markdown = await saveSystemDesignMarkdownForUser(userId, item.id, { content: input.markdownContent });
  }

  if (input.reviewOutcome) {
    await addReviewForItem(userId, item.id, { outcome: input.reviewOutcome, notesMarkdown: "Logged via agent ingest", goalId: goal?.id }, goal?.id);
    item = (await getAccessibleItem(userId, item.id)) ?? item;
  }

  return {
    item,
    goal,
    markdown,
  };
}
