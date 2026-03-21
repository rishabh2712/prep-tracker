import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { companySignalsFromItem } from "@/lib/company-signals";
import { nextReviewFromNow } from "@/lib/schedule";
import { inferSystemDesignConcept, inferSystemDesignLevel } from "@/lib/system-design-taxonomy";
import type {
  ChangeAction,
  GoalDayEntry,
  GoalDayRecord,
  GoalItemRecord,
  GoalModuleKind,
  GoalRecord,
  GoalSessionRecord,
  GoalTargetCoverageBucket,
  GoalTargetRecord,
  GoalTargetDimension,
  ItemType,
  LinkRecord,
  ModuleProgress,
  PrepItem,
  ProgressTargets,
  ProgressSnapshot,
  ReviewLog,
  ReviewOutcome,
} from "@/lib/types";
import type {
  ContentItemLinkRow,
  GoalDayEntryRow,
  GoalDayRow,
  GoalRow,
  GoalSessionRow,
  GoalTargetRow,
  HydratedContentItem,
  UserReviewLogRow,
} from "@/lib/db/types";

const SHARED_PAYLOAD_KEYS = [
  "platform",
  "problemLink",
  "problemSlug",
  "difficulty",
  "pattern",
  "systemTopic",
  "systemScaleNotes",
  "problemStatement",
  "functionalRequirements",
  "nonFunctionalRequirements",
  "capacityEstimates",
  "apiContracts",
  "dataModelNotes",
  "architectureNotes",
  "componentDeepDives",
  "scalingStrategy",
  "consistencyTradeoffs",
  "cachingStrategy",
  "failureModesRecovery",
  "observability",
  "securityPrivacy",
  "costConsiderations",
  "alternativesTradeoffs",
  "whatIMissed",
  "followUpTopics",
  "notesMarkdown",
  "metadata",
] as const;

export class DuplicateItemError extends Error {
  existingId: string;
  existingDeleted: boolean;

  constructor(message: string, existingId: string, existingDeleted: boolean) {
    super(message);
    this.name = "DuplicateItemError";
    this.existingId = existingId;
    this.existingDeleted = existingDeleted;
  }
}

export class MarkdownConflictError extends Error {
  current: { itemId: string; path: string; content: string; checksum: string; updatedAt: string };

  constructor(message: string, current: { itemId: string; path: string; content: string; checksum: string; updatedAt: string }) {
    super(message);
    this.name = "MarkdownConflictError";
    this.current = current;
  }
}

export function defaultItem(id: string, type: ItemType, nowIso: string): PrepItem {
  return {
    id,
    ownerUserId: null,
    isShared: false,
    title: "",
    type,
    notesMarkdown: "",
    state: "ACTIVE",
    mastery: "MEDIUM",
    shouldReviewAgain: true,
    reviewIntervalDays: 7,
    nextReviewAt: nextReviewFromNow(7),
    lastReviewedAt: null,
    tags: [],
    deletedAt: null,
    links: [],
    platform: null,
    problemLink: null,
    problemSlug: null,
    difficulty: null,
    pattern: null,
    attemptCount: null,
    timeSpentMinutes: null,
    confidence: null,
    lastAttemptedAt: null,
    leetcodeOutcome: null,
    lastSolvedAt: null,
    solutionSummaryMarkdown: null,
    systemTopic: null,
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
    metadata: {},
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function sanitizeTypeSpecificFields(item: PrepItem): PrepItem {
  if (item.type !== "LEETCODE") {
    item.platform = null;
    item.problemLink = null;
    item.problemSlug = null;
    item.difficulty = null;
    item.pattern = null;
    item.attemptCount = null;
    item.timeSpentMinutes = null;
    item.confidence = null;
    item.lastAttemptedAt = null;
    item.leetcodeOutcome = null;
    item.lastSolvedAt = null;
    item.solutionSummaryMarkdown = null;
  }

  if (item.type !== "SYSTEM_DESIGN" && item.type !== "LLD") {
    item.systemTopic = null;
    item.systemScaleNotes = null;
    item.problemStatement = null;
    item.functionalRequirements = null;
    item.nonFunctionalRequirements = null;
    item.capacityEstimates = null;
    item.apiContracts = null;
    item.dataModelNotes = null;
    item.architectureNotes = null;
    item.componentDeepDives = null;
    item.scalingStrategy = null;
    item.consistencyTradeoffs = null;
    item.cachingStrategy = null;
    item.failureModesRecovery = null;
    item.observability = null;
    item.securityPrivacy = null;
    item.costConsiderations = null;
    item.alternativesTradeoffs = null;
    item.whatIMissed = null;
    item.followUpTopics = null;
  }

  return item;
}

export function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  for (const value of tags) {
    const trimmed = value.trim().toLowerCase();
    if (trimmed) seen.add(trimmed);
  }
  return Array.from(seen);
}

function asIsoString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value == null) return new Date().toISOString();
  const normalized = new Date(String(value));
  if (Number.isNaN(normalized.getTime())) {
    return new Date().toISOString();
  }
  return normalized.toISOString();
}

function asNullableIsoString(value: unknown): string | null {
  if (value == null) return null;
  return asIsoString(value);
}

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\-_.:/ ]/g, "");
}

function canonicalProblemUrl(raw: string | null | undefined): string | null {
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

export function toCanonicalKey(item: Pick<PrepItem, "type" | "problemLink" | "problemSlug" | "title" | "systemTopic">): string | null {
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

export function toSharedPayload(item: PrepItem): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const key of SHARED_PAYLOAD_KEYS) {
    payload[key] = item[key];
  }
  return payload;
}

export function splitUserMetadata(): Record<string, unknown> {
  return {};
}

export function hydratePrepItem(record: HydratedContentItem): PrepItem {
  const nowIso = new Date().toISOString();
  const payload = (record.content.payload_json ?? {}) as Partial<PrepItem>;
  const mergedMetadata = {
    ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}),
    ...(record.state?.metadata_json && typeof record.state.metadata_json === "object" ? record.state.metadata_json : {}),
  };
  const baseNotes = typeof payload.notesMarkdown === "string" ? payload.notesMarkdown : "";
  const notesMarkdown = record.state?.notes_markdown?.trim() ? record.state.notes_markdown : baseNotes;
  const updatedAt = asIsoString(record.state?.updated_at ?? record.content.updated_at);
  const deletedAt = asNullableIsoString(record.state?.deleted_at ?? record.content.deleted_at);
  const item = sanitizeTypeSpecificFields({
    ...defaultItem(record.content.id, record.content.type, nowIso),
    ...(payload as Partial<PrepItem>),
    id: record.content.id,
    ownerUserId: record.content.owner_user_id,
    isShared: record.content.is_shared,
    title: record.content.title,
    type: record.content.type,
    tags: Array.isArray(record.content.tags_json) ? normalizeTags(record.content.tags_json as string[]) : [],
    deletedAt,
    links: record.links,
    notesMarkdown,
    state: record.state?.state ?? "ACTIVE",
    mastery: record.state?.mastery ?? "MEDIUM",
    shouldReviewAgain: record.state?.should_review_again ?? true,
    reviewIntervalDays: record.state?.review_interval_days ?? 7,
    nextReviewAt: asNullableIsoString(record.state?.next_review_at),
    lastReviewedAt: asNullableIsoString(record.state?.last_reviewed_at),
    attemptCount: record.state?.attempt_count ?? null,
    timeSpentMinutes: record.state?.time_spent_minutes ?? null,
    confidence: record.state?.confidence ?? null,
    lastAttemptedAt: asNullableIsoString(record.state?.last_attempted_at),
    leetcodeOutcome: record.state?.leetcode_outcome ?? null,
    lastSolvedAt: asNullableIsoString(record.state?.last_solved_at),
    solutionSummaryMarkdown: record.state?.solution_summary_markdown ?? null,
    metadata: mergedMetadata,
    createdAt: asIsoString(record.content.created_at),
    updatedAt,
  });

  return item;
}

export function mapLinks(rows: ContentItemLinkRow[]): LinkRecord[] {
  return rows.map((row) => ({ id: row.id, label: row.label, url: row.url }));
}

export function mapGoalRow(row: GoalRow): GoalRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    startDate: row.start_date,
    endDate: row.end_date,
    leetcodeTarget: row.leetcode_target,
    systemDesignTarget: row.system_design_target,
    dailyMinutesTarget: row.daily_minutes_target,
    status: row.status,
    createdAt: asIsoString(row.created_at),
    updatedAt: asIsoString(row.updated_at),
  };
}

export function mapReviewRow(row: UserReviewLogRow): ReviewLog {
  return {
    id: row.id,
    itemId: row.content_item_id,
    outcome: row.outcome,
    notesMarkdown: row.notes_markdown,
    previousReviewAt: asNullableIsoString(row.previous_review_at),
    nextReviewAt: asIsoString(row.next_review_at),
    createdAt: asIsoString(row.created_at),
  };
}

export function mapGoalDayRow(row: GoalDayRow, entries: GoalDayEntry[]): GoalDayRecord {
  return {
    id: row.id,
    goalId: row.goal_id,
    date: row.date,
    status: row.status,
    plannedMinutes: row.planned_minutes,
    actualMinutes: row.actual_minutes,
    notes: row.notes,
    entries,
  };
}

export function mapGoalDayEntryRow(row: GoalDayEntryRow, title: string): GoalDayEntry {
  return {
    id: row.id,
    dayId: row.goal_day_id,
    goalId: row.goal_id,
    itemId: row.content_item_id,
    itemTitle: title,
    itemType: row.item_type,
    entryType: row.entry_type,
    createdAt: asIsoString(row.created_at),
  };
}

export function mapGoalTargetRow(row: GoalTargetRow): GoalTargetRecord {
  return {
    goalId: row.goal_id,
    moduleKind: row.module_kind,
    dimension: row.dimension,
    bucketKey: row.bucket_key,
    targetCount: row.target_count,
    createdAt: asIsoString(row.created_at),
    updatedAt: asIsoString(row.updated_at),
  };
}

export function mapGoalSessionRow(row: GoalSessionRow, title: string): GoalSessionRecord {
  return {
    id: row.id,
    goalId: row.goal_id,
    moduleKind: row.module_kind,
    itemId: row.content_item_id,
    itemTitle: title,
    action: row.action,
    sessionAt: asIsoString(row.session_at),
    minutesSpent: row.minutes_spent,
    notesMarkdown: row.notes_markdown,
    createdAt: asIsoString(row.created_at),
    updatedAt: asIsoString(row.updated_at),
  };
}

export function toModuleProgress(target: number, done: number, velocityPerWeek: number): ModuleProgress {
  const safeTarget = Math.max(0, target);
  const remaining = Math.max(0, safeTarget - done);
  const completionPct = safeTarget === 0 ? 0 : Math.round((done / safeTarget) * 100);
  const etaDays = remaining === 0 ? 0 : velocityPerWeek > 0 ? Math.ceil((remaining / velocityPerWeek) * 7) : null;
  return {
    target: safeTarget,
    done,
    remaining,
    completionPct,
    velocityPerWeek: Number(velocityPerWeek.toFixed(2)),
    etaDays,
  };
}

export function computeProgressSnapshot(items: PrepItem[], goals: ProgressTargets): ProgressSnapshot {
  const active = items.filter((item) => !item.deletedAt);
  const leetcodeDone = active.filter((item) => item.type === "LEETCODE" && item.leetcodeOutcome === "SOLVED").length;
  const systemDone = active.filter((item) => item.type === "SYSTEM_DESIGN" && item.state === "DONE").length;

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const leetcodeVelocity = active.filter((item) => {
    if (item.type !== "LEETCODE" || item.leetcodeOutcome !== "SOLVED" || !item.lastSolvedAt) return false;
    const ms = new Date(item.lastSolvedAt).getTime();
    return Number.isFinite(ms) && ms >= oneWeekAgo;
  }).length;

  const systemVelocity = active.filter((item) => {
    if (item.type !== "SYSTEM_DESIGN" || item.state !== "DONE") return false;
    const ms = new Date(item.updatedAt).getTime();
    return Number.isFinite(ms) && ms >= oneWeekAgo;
  }).length;

  const leetcode = toModuleProgress(goals.leetcodeTarget, leetcodeDone, leetcodeVelocity);
  const systemDesign = toModuleProgress(goals.systemDesignTarget, systemDone, systemVelocity);
  const overall = toModuleProgress(
    goals.leetcodeTarget + goals.systemDesignTarget,
    leetcode.done + systemDesign.done,
    leetcode.velocityPerWeek + systemDesign.velocityPerWeek
  );

  let paceStatus: ProgressSnapshot["paceStatus"] = "NO_TARGET_DATE";
  if (goals.targetDate) {
    const targetMs = new Date(goals.targetDate).getTime();
    if (Number.isFinite(targetMs)) {
      const daysLeft = Math.ceil((targetMs - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysLeft <= 0) {
        paceStatus = overall.remaining === 0 ? "ON_TRACK" : "AT_RISK";
      } else {
        const weeksLeft = daysLeft / 7;
        const neededPerWeek = overall.remaining / weeksLeft;
        paceStatus = overall.remaining === 0 || overall.velocityPerWeek >= neededPerWeek ? "ON_TRACK" : "AT_RISK";
      }
    }
  }

  return {
    leetcode,
    systemDesign,
    overall,
    targetDate: goals.targetDate,
    paceStatus,
  };
}

export function normalizeBucketKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function trackFromItem(item: PrepItem, moduleKind: GoalModuleKind): string {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  if (moduleKind === "SYSTEM_DESIGN") {
    const metaTrack = metadata.sdTrack;
    if (typeof metaTrack === "string" && metaTrack.trim()) {
      return normalizeBucketKey(metaTrack);
    }
  }

  const tagTrack = (item.tags ?? []).find((tag) => tag.toLowerCase().startsWith("track:"));
  if (tagTrack) {
    return normalizeBucketKey(tagTrack.slice("track:".length));
  }

  return moduleKind === "LEETCODE" ? "leetcode" : "untracked";
}

function bucketKeysForItem(item: PrepItem, moduleKind: GoalModuleKind, dimension: GoalTargetDimension): string[] {
  if (moduleKind === "LEETCODE") {
    if (dimension === "PATTERN") return [normalizeBucketKey(item.pattern?.trim() || "uncategorized")];
    if (dimension === "DIFFICULTY") return [normalizeBucketKey(item.difficulty?.trim() || "unknown")];
    if (dimension === "COMPANY") {
      const names = companySignalsFromItem(item).map((entry) => normalizeBucketKey(entry.name));
      return names.length > 0 ? Array.from(new Set(names)) : [normalizeBucketKey("unknown")];
    }
    if (dimension === "TRACK") return [trackFromItem(item, "LEETCODE")];
    return [];
  }

  if (dimension === "CONCEPT") return [normalizeBucketKey(inferSystemDesignConcept(item))];
  if (dimension === "LEVEL") return [normalizeBucketKey(inferSystemDesignLevel(item))];
  if (dimension === "TRACK") return [trackFromItem(item, "SYSTEM_DESIGN")];
  return [];
}

export function computeGoalTargetCoverage(
  targets: GoalTargetRecord[],
  selectedLeetcode: GoalItemRecord[],
  selectedSystem: GoalItemRecord[]
): GoalTargetCoverageBucket[] {
  const buckets = new Map<string, GoalTargetCoverageBucket>();

  for (const target of targets) {
    const key = [target.moduleKind, target.dimension, target.bucketKey].join("::");
    buckets.set(key, {
      moduleKind: target.moduleKind,
      dimension: target.dimension,
      bucketKey: target.bucketKey,
      targetCount: target.targetCount,
      selectedCount: 0,
      doneCount: 0,
      coveragePct: 0,
      donePct: 0,
    });
  }

  const markItem = (entry: GoalItemRecord) => {
    const done =
      entry.moduleKind === "LEETCODE"
        ? entry.item.leetcodeOutcome === "SOLVED"
        : entry.item.state === "DONE";
    for (const dimension of ["PATTERN", "DIFFICULTY", "COMPANY", "CONCEPT", "LEVEL", "TRACK"] as const) {
      if (entry.moduleKind === "LEETCODE" && (dimension === "CONCEPT" || dimension === "LEVEL")) continue;
      if (entry.moduleKind === "SYSTEM_DESIGN" && (dimension === "PATTERN" || dimension === "DIFFICULTY" || dimension === "COMPANY")) continue;
      const keys = bucketKeysForItem(entry.item, entry.moduleKind, dimension);
      for (const bucketKey of keys) {
        const key = [entry.moduleKind, dimension, bucketKey].join("::");
        const bucket = buckets.get(key);
        if (!bucket) continue;
        bucket.selectedCount += 1;
        if (done) bucket.doneCount += 1;
      }
    }
  };

  selectedLeetcode.forEach(markItem);
  selectedSystem.forEach(markItem);

  return Array.from(buckets.values())
    .map((bucket) => ({
      ...bucket,
      coveragePct: bucket.targetCount === 0 ? 0 : Math.round((bucket.selectedCount / bucket.targetCount) * 100),
      donePct: bucket.targetCount === 0 ? 0 : Math.round((bucket.doneCount / bucket.targetCount) * 100),
    }))
    .sort((a, b) =>
      a.moduleKind.localeCompare(b.moduleKind) ||
      a.dimension.localeCompare(b.dimension) ||
      a.bucketKey.localeCompare(b.bucketKey)
    );
}

export function outcomeToQuality(outcome: ReviewOutcome): number {
  if (outcome === "AGAIN") return 1;
  if (outcome === "HARD") return 3;
  if (outcome === "GOOD") return 4;
  return 5;
}

export function sm2NextState(current: { repetition: number; intervalDays: number; easeFactor: number; lapses: number }, quality: number) {
  const q = Math.max(0, Math.min(5, quality));
  let repetition = current.repetition;
  let intervalDays = Math.max(1, current.intervalDays);
  let easeFactor = Math.max(1.3, current.easeFactor);
  let lapses = current.lapses;

  if (q < 3) {
    repetition = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
    if (repetition === 0) {
      intervalDays = 1;
    } else if (repetition === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    }
    repetition += 1;
  }

  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  easeFactor = Math.max(1.3, easeFactor + delta);

  return { repetition, intervalDays, easeFactor, lapses };
}

export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function addChangeLog(
  sql: Sql,
  userId: string,
  action: ChangeAction,
  contentItemId: string | null,
  details: Record<string, unknown>
) {
  await sql`
    insert into public.user_change_logs (id, user_id, content_item_id, action, details_json)
    values (${randomUUID()}, ${userId}, ${contentItemId}, ${action}, ${JSON.stringify(details)}::jsonb)
  `;
}

export function guessModuleKind(item: PrepItem): GoalModuleKind {
  return item.type === "LEETCODE" ? "LEETCODE" : "SYSTEM_DESIGN";
}

export function applyGoalSessionItemUpdates(item: PrepItem, input: { moduleKind: GoalModuleKind; action: GoalSessionRecord["action"]; minutesSpent?: number }, nowIso: string, sessionAt: string) {
  if (input.moduleKind === "LEETCODE") {
    const minutes = Math.max(0, input.minutesSpent ?? 0);
    item.timeSpentMinutes = (item.timeSpentMinutes ?? 0) + minutes;
    item.lastAttemptedAt = sessionAt;

    if (input.action === "LEETCODE_SOLVED") {
      item.attemptCount = (item.attemptCount ?? 0) + 1;
      item.lastSolvedAt = sessionAt;
      item.leetcodeOutcome = "SOLVED";
      item.shouldReviewAgain = true;
      item.nextReviewAt = item.nextReviewAt ?? sessionAt;
    }
  } else if (input.action === "SYSTEM_DESIGN_READ") {
    item.state = "DONE";
    item.shouldReviewAgain = true;
    item.nextReviewAt = item.nextReviewAt ?? sessionAt;
  }

  item.updatedAt = nowIso;
  return item;
}
