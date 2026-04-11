import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import frontendManifestJson from "../../data/frontend-bank/uber-frontend-bank.json";
import leetcodeWizardJson from "../../data/imports/leetcodewizard-uber-2026-02-21.json";
import uberRankedJson from "../../data/imports/uber-ranked-slugs-2026-03-13.json";
import { companySignalsFromItem } from "@/lib/company-signals";
import { computeNextIntervalDays, nextReviewFromNow } from "@/lib/schedule";
import { inferSystemDesignConcept, inferSystemDesignLevel } from "@/lib/system-design-taxonomy";
import type {
  ChangeAction,
  FrontendFocusProgress,
  FrontendFocusStatus,
  GoalDayEntry,
  GoalDayRecord,
  GoalItemRecord,
  MockInterviewProgress,
  MockInterviewReviewLog,
  MockInterviewStatus,
  GoalModuleKind,
  GoalProgress,
  GoalRecord,
  GoalSessionRecord,
  GoalStatus,
  GoalTargetCoverageBucket,
  GoalTargetDimension,
  GoalTargetRecord,
  ItemState,
  ItemType,
  LinkRecord,
  PrepItem,
  ProgressSnapshot,
  ReviewLog,
  ReviewOutcome,
  SystemDesignMarkdownDoc,
} from "@/lib/types";
import type {
  AgentIngestInput,
  FrontendFocusProgressUpdateInput,
  MockInterviewProgressUpdateInput,
  MockInterviewReviewInput,
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

type FrontendManifestSource = {
  label: string;
  url: string;
};

type FrontendManifestEntry = {
  seedKey: string;
  bankId: string;
  title: string;
  type: ItemType;
  frontendTab: string;
  entryKind: string;
  conceptCluster: string;
  roundTag: string;
  priority: string;
  difficulty: string;
  level: string;
  timebox: string;
  whyItMatters: string;
  expectedShape: string;
  studyGuideMarkdown?: string | null;
  reportedContext?: string | null;
  reportedPrompt?: string | null;
  practicePrompt?: string | null;
  sourceRefs: string[];
  tags: string[];
  notesMarkdown: string;
  links: Array<{ label: string; url: string }>;
  platform?: string | null;
  problemSlug?: string | null;
  problemLink?: string | null;
  pattern?: string | null;
  leetcodeOutcome?: string | null;
  systemTopic?: string | null;
};

type FrontendManifest = {
  surface: string;
  generatedAt: string;
  sources: Record<string, FrontendManifestSource>;
  entries: FrontendManifestEntry[];
};

type RankedImport = {
  capturedAt: string;
  periods: Record<string, string[]>;
};

type LeetcodeWizardMergedProblem = {
  slug: string;
  title: string;
  externalId?: number;
  paidOnly?: boolean;
  tags?: string[];
  frequencies?: Record<string, number>;
  score?: number;
  difficulty?: string | null;
  pattern?: string | null;
  link?: string | null;
};

type LeetcodeWizardImport = {
  source: string;
  companyId: string;
  fetchedAt: string;
  mergedProblems: LeetcodeWizardMergedProblem[];
};

type UberHackerRankDerivedRow = {
  hackerrank_title: string;
  hackerrank_difficulty: string;
  hackerrank_access: string;
  mapping_quality: string;
  derived_statement: string;
  leetcode_title: string;
  leetcode_slug: string;
  leetcode_link: string;
  pattern: string;
};

function normalizedMarkdown(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

type ItemRow = {
  id: string;
  title: string;
  type: ItemType;
  notes_markdown: string;
  state: ItemState;
  mastery: PrepItem["mastery"];
  should_review_again: number;
  review_interval_days: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  tags_json: string;
  links_json: string;
  deleted_at: string | null;
  platform: string | null;
  problem_link: string | null;
  problem_slug: string | null;
  difficulty: string | null;
  pattern: string | null;
  attempt_count: number | null;
  time_spent_minutes: number | null;
  confidence: PrepItem["confidence"];
  last_attempted_at: string | null;
  leetcode_outcome: PrepItem["leetcodeOutcome"];
  last_solved_at: string | null;
  solution_summary_markdown: string | null;
  system_topic: string | null;
  system_scale_notes: string | null;
  problem_statement: string | null;
  functional_requirements: string | null;
  non_functional_requirements: string | null;
  capacity_estimates: string | null;
  api_contracts: string | null;
  data_model_notes: string | null;
  architecture_notes: string | null;
  component_deep_dives: string | null;
  scaling_strategy: string | null;
  consistency_tradeoffs: string | null;
  caching_strategy: string | null;
  failure_modes_recovery: string | null;
  observability: string | null;
  security_privacy: string | null;
  cost_considerations: string | null;
  alternatives_tradeoffs: string | null;
  what_i_missed: string | null;
  follow_up_topics: string | null;
  metadata_json: string;
  canonical_key: string | null;
  owner_user_id: string | null;
  is_shared: number;
  created_at: string;
  updated_at: string;
};

type GoalRow = {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  leetcode_target: number;
  system_design_target: number;
  daily_minutes_target: number;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
};

type GoalDayRow = {
  id: string;
  goal_id: string;
  date: string;
  status: GoalDayRecord["status"];
  planned_minutes: number;
  actual_minutes: number;
  notes: string;
};

type GoalDayEntryRow = {
  id: string;
  goal_day_id: string;
  goal_id: string;
  item_id: string;
  item_type: GoalModuleKind;
  entry_type: GoalDayEntry["entryType"];
  created_at: string;
};

type GoalTargetRow = {
  goal_id: string;
  module_kind: GoalModuleKind;
  dimension: GoalTargetDimension;
  bucket_key: string;
  target_count: number;
  created_at: string;
  updated_at: string;
};

type GoalSessionRow = {
  id: string;
  goal_id: string;
  item_id: string;
  module_kind: GoalModuleKind;
  action: GoalSessionRecord["action"];
  session_at: string;
  minutes_spent: number;
  notes_markdown: string;
  created_at: string;
  updated_at: string;
};

type ReviewRow = {
  id: string;
  item_id: string;
  outcome: ReviewOutcome;
  notes_markdown: string;
  previous_review_at: string | null;
  next_review_at: string;
  created_at: string;
};

type MockInterviewProgressRow = {
  question_id: string;
  status: MockInterviewStatus;
  review_count: number;
  last_outcome: ReviewOutcome | null;
  last_reviewed_at: string | null;
  completed_at: string | null;
  notes_markdown: string;
  created_at: string;
  updated_at: string;
};

type MockInterviewReviewRow = {
  id: string;
  question_id: string;
  outcome: ReviewOutcome;
  status_after: MockInterviewStatus;
  notes_markdown: string;
  created_at: string;
};

type FrontendFocusProgressRow = {
  question_id: string;
  status: FrontendFocusStatus;
  created_at: string;
  updated_at: string;
};

const FRONTEND_MANIFEST = frontendManifestJson as FrontendManifest;
const LEETCODE_WIZARD_IMPORT = leetcodeWizardJson as LeetcodeWizardImport;
const UBER_RANKED_IMPORT = uberRankedJson as RankedImport;
const UBER_HACKERRANK_DERIVED_IMPORT_PATH = path.join(
  process.cwd(),
  "data",
  "imports",
  "uber-hackerrank-derived-2026-03-25.csv"
);
const LOCAL_DB_PATH = process.env.PREP_TRACKER_DB_PATH?.trim() || path.join(process.cwd(), "data", "prep.db");

const MANUAL_RANKED_LEETCODE_ENRICHMENTS: Record<string, { difficulty: string; pattern: string }> = {
  "shortest-path-to-get-all-keys": { difficulty: "Hard", pattern: "Graphs" },
  "longest-subsequence-with-limited-sum": { difficulty: "Easy", pattern: "Binary Search" },
  "maximum-number-of-alloys": { difficulty: "Medium", pattern: "Binary Search" },
  "vertical-order-traversal-of-a-binary-tree": { difficulty: "Hard", pattern: "Trees" },
  "minimum-jumps-to-reach-end-via-prime-teleportation": { difficulty: "Hard", pattern: "Graphs" },
  "find-all-people-with-secret": { difficulty: "Hard", pattern: "Graphs" },
  "rearranging-fruits": { difficulty: "Hard", pattern: "Greedy" },
  ipo: { difficulty: "Hard", pattern: "Heap / Priority Queue" },
  "maximum-number-of-points-from-grid-queries": { difficulty: "Hard", pattern: "Heap / Priority Queue" },
  "minimum-knight-moves": { difficulty: "Medium", pattern: "Graphs" },
};

declare global {
  var __prepTrackerLocalDb__: Database.Database | undefined;
  var __prepTrackerLocalDbReady__: boolean | undefined;
  var __prepTrackerLocalDbSeeded__: boolean | undefined;
}

const ITEM_COLUMNS = [
  "id",
  "title",
  "type",
  "notes_markdown",
  "state",
  "mastery",
  "should_review_again",
  "review_interval_days",
  "next_review_at",
  "last_reviewed_at",
  "tags_json",
  "links_json",
  "deleted_at",
  "platform",
  "problem_link",
  "problem_slug",
  "difficulty",
  "pattern",
  "attempt_count",
  "time_spent_minutes",
  "confidence",
  "last_attempted_at",
  "leetcode_outcome",
  "last_solved_at",
  "solution_summary_markdown",
  "system_topic",
  "system_scale_notes",
  "problem_statement",
  "functional_requirements",
  "non_functional_requirements",
  "capacity_estimates",
  "api_contracts",
  "data_model_notes",
  "architecture_notes",
  "component_deep_dives",
  "scaling_strategy",
  "consistency_tradeoffs",
  "caching_strategy",
  "failure_modes_recovery",
  "observability",
  "security_privacy",
  "cost_considerations",
  "alternatives_tradeoffs",
  "what_i_missed",
  "follow_up_topics",
  "metadata_json",
  "canonical_key",
  "owner_user_id",
  "is_shared",
  "created_at",
  "updated_at",
] as const;

const ITEM_INSERT_SQL = `insert into items (${ITEM_COLUMNS.join(", ")}) values (${ITEM_COLUMNS.map((column) => `@${column}`).join(", ")})`;
const ITEM_UPDATE_SQL = `update items set ${ITEM_COLUMNS.filter((column) => column !== "id")
  .map((column) => `${column}=@${column}`)
  .join(", ")} where id=@id`;

const SYSTEM_DESIGN_DOCS_DIR = path.join(process.cwd(), "..", "..", "prep", "content", "system-design");
const DEFAULT_GOAL_NAME = "Uber 60 Day Sprint";
const DEFAULT_GOAL_DAYS = 60;
const DEFAULT_LEETCODE_TARGET = 60;
const DEFAULT_SYSTEM_DESIGN_TARGET = 20;

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
  current: SystemDesignMarkdownDoc;

  constructor(message: string, current: SystemDesignMarkdownDoc) {
    super(message);
    this.name = "MarkdownConflictError";
    this.current = current;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function jsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseSimpleCsv(raw: string): Array<Record<string, string>> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((value) => value.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function loadUberHackerRankDerivedImport(): UberHackerRankDerivedRow[] {
  try {
    const raw = readFileSync(UBER_HACKERRANK_DERIVED_IMPORT_PATH, "utf8");
    return parseSimpleCsv(raw) as UberHackerRankDerivedRow[];
  } catch {
    return [];
  }
}

const UBER_HACKERRANK_DERIVED_IMPORT = loadUberHackerRankDerivedImport();

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function normalizeTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  for (const tag of tags ?? []) {
    const normalized = String(tag ?? "").trim().toLowerCase();
    if (!normalized) continue;
    seen.add(normalized);
  }
  return Array.from(seen);
}

function dedupeLinks(links: Array<{ id?: string; label: string; url: string }> | undefined): LinkRecord[] {
  const seen = new Set<string>();
  const out: LinkRecord[] = [];
  for (const link of links ?? []) {
    const url = String(link?.url ?? "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: link.id ?? randomUUID(),
      label: String(link.label ?? url).trim() || url,
      url,
    });
  }
  return out;
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

function toCanonicalKey(item: Pick<PrepItem, "type" | "problemLink" | "problemSlug" | "title" | "systemTopic">): string | null {
  if (item.type === "LEETCODE") {
    const url = canonicalProblemUrl(item.problemLink);
    if (url) return `LEETCODE:url:${url}`;
    const slug = normalizeText(item.problemSlug);
    if (slug) return `LEETCODE:slug:${slug}`;
    const title = normalizeText(item.title);
    return title ? `LEETCODE:title:${title}` : null;
  }

  if (item.type === "SYSTEM_DESIGN" || item.type === "LLD") {
    const topic = normalizeText(item.systemTopic);
    if (topic) return `${item.type}:topic:${topic}`;
  }

  const title = normalizeText(item.title);
  return title ? `${item.type}:title:${title}` : null;
}

function defaultItem(id: string, type: ItemType, timestamp: string): PrepItem {
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
    nextReviewAt: null,
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
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function sanitizeTypeSpecificFields(item: PrepItem): PrepItem {
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

function rowToItem(row: ItemRow): PrepItem {
  const timestamp = row.updated_at || row.created_at || nowIso();
  const item = sanitizeTypeSpecificFields({
    ...defaultItem(row.id, row.type, timestamp),
    id: row.id,
    ownerUserId: row.owner_user_id,
    isShared: Boolean(row.is_shared),
    title: row.title,
    type: row.type,
    notesMarkdown: row.notes_markdown ?? "",
    state: row.state,
    mastery: row.mastery,
    shouldReviewAgain: Boolean(row.should_review_again),
    reviewIntervalDays: row.review_interval_days ?? 7,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at,
    tags: normalizeTags(jsonParse<string[]>(row.tags_json, [])),
    links: dedupeLinks(jsonParse<LinkRecord[]>(row.links_json, [])),
    deletedAt: row.deleted_at,
    platform: row.platform,
    problemLink: row.problem_link,
    problemSlug: row.problem_slug,
    difficulty: row.difficulty,
    pattern: row.pattern,
    attemptCount: row.attempt_count,
    timeSpentMinutes: row.time_spent_minutes,
    confidence: row.confidence,
    lastAttemptedAt: row.last_attempted_at,
    leetcodeOutcome: row.leetcode_outcome,
    lastSolvedAt: row.last_solved_at,
    solutionSummaryMarkdown: row.solution_summary_markdown,
    systemTopic: row.system_topic,
    systemScaleNotes: row.system_scale_notes,
    problemStatement: row.problem_statement,
    functionalRequirements: row.functional_requirements,
    nonFunctionalRequirements: row.non_functional_requirements,
    capacityEstimates: row.capacity_estimates,
    apiContracts: row.api_contracts,
    dataModelNotes: row.data_model_notes,
    architectureNotes: row.architecture_notes,
    componentDeepDives: row.component_deep_dives,
    scalingStrategy: row.scaling_strategy,
    consistencyTradeoffs: row.consistency_tradeoffs,
    cachingStrategy: row.caching_strategy,
    failureModesRecovery: row.failure_modes_recovery,
    observability: row.observability,
    securityPrivacy: row.security_privacy,
    costConsiderations: row.cost_considerations,
    alternativesTradeoffs: row.alternatives_tradeoffs,
    whatIMissed: row.what_i_missed,
    followUpTopics: row.follow_up_topics,
    metadata: jsonParse<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  if (typeof item.metadata !== "object" || Array.isArray(item.metadata) || !item.metadata) {
    item.metadata = {};
  }
  return item;
}

function itemToRow(item: PrepItem): ItemRow {
  const cleaned = sanitizeTypeSpecificFields({ ...item, tags: normalizeTags(item.tags), links: dedupeLinks(item.links) });
  return {
    id: cleaned.id,
    title: cleaned.title,
    type: cleaned.type,
    notes_markdown: cleaned.notesMarkdown ?? "",
    state: cleaned.state,
    mastery: cleaned.mastery,
    should_review_again: cleaned.shouldReviewAgain ? 1 : 0,
    review_interval_days: cleaned.reviewIntervalDays,
    next_review_at: cleaned.nextReviewAt,
    last_reviewed_at: cleaned.lastReviewedAt,
    tags_json: JSON.stringify(cleaned.tags),
    links_json: JSON.stringify(cleaned.links),
    deleted_at: cleaned.deletedAt,
    platform: cleaned.platform,
    problem_link: cleaned.problemLink,
    problem_slug: cleaned.problemSlug,
    difficulty: cleaned.difficulty,
    pattern: cleaned.pattern,
    attempt_count: cleaned.attemptCount,
    time_spent_minutes: cleaned.timeSpentMinutes,
    confidence: cleaned.confidence,
    last_attempted_at: cleaned.lastAttemptedAt,
    leetcode_outcome: cleaned.leetcodeOutcome,
    last_solved_at: cleaned.lastSolvedAt,
    solution_summary_markdown: cleaned.solutionSummaryMarkdown,
    system_topic: cleaned.systemTopic,
    system_scale_notes: cleaned.systemScaleNotes,
    problem_statement: cleaned.problemStatement,
    functional_requirements: cleaned.functionalRequirements,
    non_functional_requirements: cleaned.nonFunctionalRequirements,
    capacity_estimates: cleaned.capacityEstimates,
    api_contracts: cleaned.apiContracts,
    data_model_notes: cleaned.dataModelNotes,
    architecture_notes: cleaned.architectureNotes,
    component_deep_dives: cleaned.componentDeepDives,
    scaling_strategy: cleaned.scalingStrategy,
    consistency_tradeoffs: cleaned.consistencyTradeoffs,
    caching_strategy: cleaned.cachingStrategy,
    failure_modes_recovery: cleaned.failureModesRecovery,
    observability: cleaned.observability,
    security_privacy: cleaned.securityPrivacy,
    cost_considerations: cleaned.costConsiderations,
    alternatives_tradeoffs: cleaned.alternativesTradeoffs,
    what_i_missed: cleaned.whatIMissed,
    follow_up_topics: cleaned.followUpTopics,
    metadata_json: JSON.stringify(cleaned.metadata ?? {}),
    canonical_key: toCanonicalKey(cleaned),
    owner_user_id: cleaned.ownerUserId,
    is_shared: cleaned.isShared ? 1 : 0,
    created_at: cleaned.createdAt,
    updated_at: cleaned.updatedAt,
  };
}

function normalizeBucketKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function guessModuleKind(item: PrepItem): GoalModuleKind {
  return item.type === "LEETCODE" ? "LEETCODE" : "SYSTEM_DESIGN";
}

function trackFromItem(item: PrepItem, moduleKind: GoalModuleKind): string {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  if (moduleKind === "SYSTEM_DESIGN") {
    const metaTrack = metadata.sdTrack;
    if (typeof metaTrack === "string" && metaTrack.trim()) return normalizeBucketKey(metaTrack);
  }
  const tagTrack = item.tags.find((tag) => tag.startsWith("track:"));
  if (tagTrack) return normalizeBucketKey(tagTrack.slice("track:".length));
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

function computeGoalTargetCoverage(
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
    const done = entry.moduleKind === "LEETCODE" ? entry.item.leetcodeOutcome === "SOLVED" : entry.item.state === "DONE";
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
    .sort((a, b) => a.moduleKind.localeCompare(b.moduleKind) || a.dimension.localeCompare(b.dimension) || a.bucketKey.localeCompare(b.bucketKey));
}

function toModuleProgress(target: number, done: number, velocityPerWeek: number) {
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

function computeProgressSnapshot(items: PrepItem[], goals: { leetcodeTarget: number; systemDesignTarget: number; targetDate: string | null }): ProgressSnapshot {
  const active = items.filter((item) => !item.deletedAt);
  const leetcodeDone = active.filter((item) => item.type === "LEETCODE" && item.leetcodeOutcome === "SOLVED").length;
  const systemDone = active.filter((item) => item.type === "SYSTEM_DESIGN" && item.state === "DONE").length;
  const oneWeekAgo = Date.now() - 7 * 86400000;

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
      const daysLeft = Math.ceil((targetMs - Date.now()) / 86400000);
      if (daysLeft <= 0) {
        paceStatus = overall.remaining === 0 ? "ON_TRACK" : "AT_RISK";
      } else {
        const weeksLeft = daysLeft / 7;
        const neededPerWeek = weeksLeft > 0 ? overall.remaining / weeksLeft : Infinity;
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

function outcomeToQuality(outcome: ReviewOutcome): number {
  if (outcome === "AGAIN") return 1;
  if (outcome === "HARD") return 3;
  if (outcome === "GOOD") return 4;
  return 5;
}

function sm2NextState(current: { repetition: number; intervalDays: number; easeFactor: number; lapses: number }, quality: number) {
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
    if (repetition === 0) intervalDays = 1;
    else if (repetition === 1) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    repetition += 1;
  }

  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  easeFactor = Math.max(1.3, easeFactor + delta);
  return { repetition, intervalDays, easeFactor, lapses };
}

function applyGoalSessionItemUpdates(item: PrepItem, input: { moduleKind: GoalModuleKind; action: GoalSessionRecord["action"]; minutesSpent?: number }, timestamp: string) {
  if (input.moduleKind === "LEETCODE") {
    const minutes = Math.max(0, input.minutesSpent ?? 0);
    item.timeSpentMinutes = (item.timeSpentMinutes ?? 0) + minutes;
    item.lastAttemptedAt = timestamp;
    if (input.action === "LEETCODE_SOLVED") {
      item.attemptCount = (item.attemptCount ?? 0) + 1;
      item.lastSolvedAt = timestamp;
      item.leetcodeOutcome = "SOLVED";
      item.shouldReviewAgain = true;
      item.nextReviewAt = item.nextReviewAt ?? timestamp;
    }
  } else if (input.action === "SYSTEM_DESIGN_READ") {
    item.state = "DONE";
    item.shouldReviewAgain = true;
    item.nextReviewAt = item.nextReviewAt ?? timestamp;
  }
  item.updatedAt = timestamp;
  return item;
}

function buildDateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return dates;

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (dates.length > 500) break;
  }
  return dates;
}

function initializeDatabase(db: Database.Database) {
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

    create table if not exists mock_interview_progress (
      question_id text primary key,
      status text not null default 'NOT_STARTED',
      review_count integer not null default 0,
      last_outcome text,
      last_reviewed_at text,
      completed_at text,
      notes_markdown text not null default '',
      created_at text not null,
      updated_at text not null
    );

    create table if not exists mock_interview_reviews (
      id text primary key,
      question_id text not null,
      outcome text not null,
      status_after text not null,
      notes_markdown text not null default '',
      created_at text not null
    );
    create index if not exists idx_mock_interview_reviews_question on mock_interview_reviews(question_id, created_at desc);

    create table if not exists frontend_focus_progress (
      question_id text primary key,
      status text not null default 'NOT_DONE',
      created_at text not null,
      updated_at text not null
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

function getDb() {
  if (!globalThis.__prepTrackerLocalDb__) {
    mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
    globalThis.__prepTrackerLocalDb__ = new Database(LOCAL_DB_PATH);
    globalThis.__prepTrackerLocalDb__.pragma("journal_mode = WAL");
    globalThis.__prepTrackerLocalDb__.pragma("foreign_keys = ON");
  }

  initializeDatabase(globalThis.__prepTrackerLocalDb__);

  if (!globalThis.__prepTrackerLocalDbReady__) {
    ensureSeedData(globalThis.__prepTrackerLocalDb__);
    globalThis.__prepTrackerLocalDbReady__ = true;
  }

  return globalThis.__prepTrackerLocalDb__;
}

type RankedProblem = {
  slug: string;
  link: string;
  frequencies: Record<string, number>;
};

type GoalDayEntryJoinedRow = GoalDayEntryRow & {
  item_title: string;
};

type SeedSystemDesignDoc = {
  title: string;
  content: string;
  relativePath: string;
  track: string;
};

function safeTime(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NaN;
}

function mergeTags(existing: string[] | undefined, next: string[] | undefined): string[] {
  return normalizeTags([...(existing ?? []), ...(next ?? [])]);
}

function mergeLinks(existing: LinkRecord[] | undefined, next: Array<{ id?: string; label: string; url: string }> | undefined): LinkRecord[] {
  return dedupeLinks([...(existing ?? []), ...(next ?? [])]);
}

function normalizeLeetcodeOutcomeValue(raw: string | null | undefined): PrepItem["leetcodeOutcome"] {
  if (raw === "TODO" || raw === "SOLVED" || raw === "PARTIAL" || raw === "STUCK") return raw;
  return null;
}

function difficultyRank(value: string | null | undefined): number {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "easy") return 0;
  if (raw === "medium") return 1;
  if (raw === "hard") return 2;
  return 3;
}

function searchTextForItem(item: PrepItem): string {
  return [
    item.title,
    item.notesMarkdown,
    item.problemSlug,
    item.problemLink,
    item.pattern,
    item.difficulty,
    item.systemTopic,
    item.systemScaleNotes,
    item.problemStatement,
    item.functionalRequirements,
    item.nonFunctionalRequirements,
    item.metadata ? JSON.stringify(item.metadata) : "",
    ...item.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function compareItems(a: PrepItem, b: PrepItem): number {
  const aDue = safeTime(a.nextReviewAt);
  const bDue = safeTime(b.nextReviewAt);
  const aHasDue = Number.isFinite(aDue);
  const bHasDue = Number.isFinite(bDue);
  if (aHasDue && bHasDue && aDue !== bDue) return aDue - bDue;
  if (aHasDue !== bHasDue) return aHasDue ? -1 : 1;

  const aUpdated = safeTime(a.updatedAt);
  const bUpdated = safeTime(b.updatedAt);
  if (Number.isFinite(aUpdated) && Number.isFinite(bUpdated) && aUpdated !== bUpdated) {
    return bUpdated - aUpdated;
  }

  return a.title.localeCompare(b.title);
}

function parseMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function getItemRowById(db: Database.Database, id: string): ItemRow | undefined {
  return db.prepare("select * from items where id = ?").get(id) as ItemRow | undefined;
}

function getItemByIdLocal(db: Database.Database, id: string): PrepItem | null {
  const row = getItemRowById(db, id);
  return row ? rowToItem(row) : null;
}

function getItemByCanonicalKey(db: Database.Database, canonicalKey: string): PrepItem | null {
  const row = db.prepare("select * from items where canonical_key = ?").get(canonicalKey) as ItemRow | undefined;
  return row ? rowToItem(row) : null;
}

function getItemByTypeTitle(db: Database.Database, type: ItemType, title: string): PrepItem | null {
  const row = db
    .prepare("select * from items where type = ? and lower(title) = lower(?) order by created_at asc limit 1")
    .get(type, title) as ItemRow | undefined;
  return row ? rowToItem(row) : null;
}

function getAllItemsLocal(db: Database.Database, includeDeleted = false): PrepItem[] {
  const rows = db
    .prepare(`select * from items ${includeDeleted ? "" : "where deleted_at is null"} order by updated_at desc, title asc`)
    .all() as ItemRow[];
  return rows.map(rowToItem);
}

function ensureNoDuplicate(db: Database.Database, item: PrepItem, currentId?: string) {
  const canonicalKey = toCanonicalKey(item);
  if (canonicalKey) {
    const duplicate = getItemByCanonicalKey(db, canonicalKey);
    if (duplicate && duplicate.id !== currentId) {
      throw new DuplicateItemError("An item with this canonical key already exists", duplicate.id, Boolean(duplicate.deletedAt));
    }
    return;
  }

  const duplicate = getItemByTypeTitle(db, item.type, item.title);
  if (duplicate && duplicate.id !== currentId) {
    throw new DuplicateItemError("An item with this title already exists", duplicate.id, Boolean(duplicate.deletedAt));
  }
}

function persistItem(db: Database.Database, item: PrepItem): PrepItem {
  const row = itemToRow(item);
  const exists = getItemRowById(db, item.id);
  if (exists) {
    db.prepare(ITEM_UPDATE_SQL).run(row);
  } else {
    db.prepare(ITEM_INSERT_SQL).run(row);
  }
  return getItemByIdLocal(db, item.id) ?? item;
}

function logChange(db: Database.Database, action: ChangeAction, itemId: string | null, details: Record<string, unknown>) {
  db.prepare("insert into change_logs (id, item_id, action, details_json, created_at) values (?, ?, ?, ?, ?)")
    .run(randomUUID(), itemId, action, JSON.stringify(details), nowIso());
}

function getGoalRowById(db: Database.Database, goalId: string): GoalRow | undefined {
  return db.prepare("select * from goals where id = ?").get(goalId) as GoalRow | undefined;
}

function rowToGoal(row: GoalRow): GoalRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    leetcodeTarget: row.leetcode_target,
    systemDesignTarget: row.system_design_target,
    dailyMinutesTarget: row.daily_minutes_target,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function persistGoal(db: Database.Database, goal: GoalRecord) {
  const existing = getGoalRowById(db, goal.id);
  const params = {
    id: goal.id,
    name: goal.name,
    description: goal.description,
    start_date: goal.startDate,
    end_date: goal.endDate,
    leetcode_target: goal.leetcodeTarget,
    system_design_target: goal.systemDesignTarget,
    daily_minutes_target: goal.dailyMinutesTarget,
    status: goal.status,
    created_at: goal.createdAt,
    updated_at: goal.updatedAt,
  };

  if (existing) {
    db.prepare(`
      update goals
      set name=@name,
          description=@description,
          start_date=@start_date,
          end_date=@end_date,
          leetcode_target=@leetcode_target,
          system_design_target=@system_design_target,
          daily_minutes_target=@daily_minutes_target,
          status=@status,
          updated_at=@updated_at
      where id=@id
    `).run(params);
  } else {
    db.prepare(`
      insert into goals (
        id, name, description, start_date, end_date, leetcode_target, system_design_target,
        daily_minutes_target, status, created_at, updated_at
      ) values (
        @id, @name, @description, @start_date, @end_date, @leetcode_target, @system_design_target,
        @daily_minutes_target, @status, @created_at, @updated_at
      )
    `).run(params);
  }
}

function ensureGoalDays(db: Database.Database, goal: GoalRecord) {
  const dates = new Set(buildDateRange(goal.startDate, goal.endDate));
  const existingRows = db.prepare("select * from goal_days where goal_id = ?").all(goal.id) as GoalDayRow[];
  const existingByDate = new Map(existingRows.map((row) => [row.date, row]));
  const now = nowIso();

  for (const date of dates) {
    if (existingByDate.has(date)) continue;
    db.prepare(`
      insert into goal_days (
        id, goal_id, date, status, planned_minutes, actual_minutes, notes, created_at, updated_at
      ) values (?, ?, ?, 'NOT_STARTED', ?, 0, '', ?, ?)
    `).run(randomUUID(), goal.id, date, goal.dailyMinutesTarget, now, now);
  }

  for (const row of existingRows) {
    if (dates.has(row.date)) continue;
    db.prepare("delete from goal_days where id = ?").run(row.id);
  }
}

function normalizeSlug(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";

  if (!value.includes("/")) {
    return value.toLowerCase().replace(/^\/+|\/+$/g, "");
  }

  try {
    const url = new URL(value);
    const match = url.pathname.toLowerCase().match(/\/problems\/([^/]+)/);
    return match?.[1] ?? "";
  } catch {
    const match = value.toLowerCase().match(/problems\/([^/?#]+)/);
    return match?.[1] ?? "";
  }
}

function humanizeSlug(slug: string): string {
  const acronyms = new Set(["api", "ui", "ux", "llm", "rag", "sdk", "rpc", "eta", "url", "sql", "cpu", "gpu", "dns", "http"]);
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (acronyms.has(lower) || /^\d+$/.test(lower) || lower.length <= 2) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function scoreForRank(index: number): number {
  return Math.max(1, 100 - index);
}

function buildRankedProblems(): RankedProblem[] {
  const periods = UBER_RANKED_IMPORT.periods ?? {};
  const bySlug = new Map<string, RankedProblem>();
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const period of ["thirty-days", "three-months", "six-months"] as const) {
    const entries = Array.isArray(periods[period]) ? periods[period] : [];
    entries.forEach((entry, index) => {
      const slug = normalizeSlug(entry);
      if (!slug) return;
      const current = bySlug.get(slug) ?? { slug, link: `https://leetcode.com/problems/${slug}/`, frequencies: {} };
      current.frequencies[period] = scoreForRank(index);
      bySlug.set(slug, current);
      if (!seen.has(slug)) {
        seen.add(slug);
        ordered.push(slug);
      }
    });
  }

  ordered.forEach((slug, index) => {
    const current = bySlug.get(slug);
    if (!current) return;
    current.frequencies.all = scoreForRank(index);
  });

  return ordered.map((slug) => bySlug.get(slug)).filter((item): item is RankedProblem => Boolean(item));
}

function frontendMetadata(entry: FrontendManifestEntry): Record<string, unknown> {
  return {
    surface: FRONTEND_MANIFEST.surface,
    frontendTab: entry.frontendTab,
    entryKind: entry.entryKind,
    conceptCluster: entry.conceptCluster,
    roundTag: entry.roundTag,
    priority: entry.priority,
    seedKey: entry.seedKey,
    bankId: entry.bankId,
    sourceRefs: entry.sourceRefs.map((id) => FRONTEND_MANIFEST.sources[id]).filter(Boolean),
    timebox: entry.timebox,
    difficulty: entry.difficulty,
    level: entry.level,
    whyItMatters: entry.whyItMatters,
    expectedShape: entry.expectedShape,
    studyGuideMarkdown: entry.studyGuideMarkdown ?? null,
    reportedContext: entry.reportedContext ?? null,
    reportedPrompt: entry.reportedPrompt ?? null,
    practicePrompt: entry.practicePrompt ?? null,
  };
}

function companyFrequenciesWithUber(existing: unknown, uberScore: number) {
  const rows = Array.isArray(existing) ? existing : [];
  const merged: Array<{ name: string; score: number }> = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const name = String((row as { name?: unknown }).name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (key === "uber" || seen.has(key)) continue;
    seen.add(key);
    merged.push({ name, score: Number((row as { score?: unknown }).score ?? 0) || 0 });
  }

  merged.unshift({ name: "Uber", score: uberScore });
  return merged;
}

function buildRankedMetadata(existing: Record<string, unknown>, problem: RankedProblem, timestamp: string) {
  const existingLww =
    existing.leetcodeWizard && typeof existing.leetcodeWizard === "object" && !Array.isArray(existing.leetcodeWizard)
      ? (existing.leetcodeWizard as Record<string, unknown>)
      : {};

  return {
    ...existing,
    source: "leetcodewizard",
    lastIngestedAt: timestamp,
    companyFrequency: companyFrequenciesWithUber(existing.companyFrequency, problem.frequencies.all ?? 0),
    uberFrequencyImport: {
      importedAt: timestamp,
      sourceFile: "uber-ranked-slugs-2026-03-13.json",
    },
    leetcodeWizard: {
      ...existingLww,
      fetchedAt: timestamp,
      companyId: "uber",
      frequencies: problem.frequencies,
      rankedBy: "manual-link-order",
    },
  };
}

function getLeetcodeWizardProblem(problemSlug: string | null | undefined) {
  const normalizedSlug = normalizeSlug(problemSlug);
  if (!normalizedSlug) return null;
  return LEETCODE_WIZARD_IMPORT.mergedProblems.find((problem) => normalizeSlug(problem.slug) === normalizedSlug) ?? null;
}

function getRankedLeetcodeEnrichment(problemSlug: string | null | undefined) {
  const normalizedSlug = normalizeSlug(problemSlug);
  if (!normalizedSlug) return null;

  const wizardProblem = getLeetcodeWizardProblem(normalizedSlug);
  if (wizardProblem) {
    return {
      title: wizardProblem.title?.trim() || humanizeSlug(normalizedSlug),
      difficulty: wizardProblem.difficulty?.trim() || null,
      pattern: wizardProblem.pattern?.trim() || null,
      link: canonicalProblemUrl(wizardProblem.link) ?? `https://leetcode.com/problems/${normalizedSlug}/`,
      extraTags: normalizeTags([
        ...(wizardProblem.tags ?? []).map((tag) => `topic:${String(tag).trim().toLowerCase().replace(/\s+/g, "-")}`),
        wizardProblem.difficulty ? `difficulty:${wizardProblem.difficulty}` : "",
        wizardProblem.pattern ? `pattern:${wizardProblem.pattern}` : "",
      ]),
      metadata: {
        externalId: wizardProblem.externalId ?? null,
        paidOnly: Boolean(wizardProblem.paidOnly),
        tags: wizardProblem.tags ?? [],
        frequencies: wizardProblem.frequencies ?? {},
        fetchedAt: LEETCODE_WIZARD_IMPORT.fetchedAt,
      },
    };
  }

  const manual = MANUAL_RANKED_LEETCODE_ENRICHMENTS[normalizedSlug];
  if (!manual) return null;

  return {
    title: humanizeSlug(normalizedSlug),
    difficulty: manual.difficulty,
    pattern: manual.pattern,
    link: `https://leetcode.com/problems/${normalizedSlug}/`,
    extraTags: normalizeTags([`difficulty:${manual.difficulty}`, `pattern:${manual.pattern}`]),
    metadata: null,
  };
}

function getLeetcodeItemMatch(db: Database.Database, problemSlug: string | null | undefined, problemLink: string | null | undefined, title: string) {
  const normalizedSlug = normalizeSlug(problemSlug);
  if (normalizedSlug) {
    const slugRow = db.prepare("select * from items where problem_slug = ? order by created_at asc limit 1").get(normalizedSlug) as ItemRow | undefined;
    if (slugRow) return rowToItem(slugRow);
  }

  const normalizedUrl = canonicalProblemUrl(problemLink);
  if (normalizedUrl) {
    const urlRow = db.prepare("select * from items where canonical_key = ? order by created_at asc limit 1").get(`LEETCODE:url:${normalizedUrl}`) as ItemRow | undefined;
    if (urlRow) return rowToItem(urlRow);
  }

  return getItemByTypeTitle(db, "LEETCODE", title);
}

function fileSlug(fileName: string): string {
  let slug = fileName.replace(/\.md$/i, "");
  slug = slug.replace(/-[0-9a-f]{8}$/i, "");
  slug = slug.replace(/^[a-z]\d+-/i, "");
  slug = slug.replace(/^[a-z]\d+-/i, "");
  return slug;
}

function inferSystemTrackFromSlug(slug: string): string {
  const value = slug.toLowerCase();
  if (value.startsWith("backend-core-")) return "backend-core";
  if (/^(a|b)\d/.test(value) || value.includes("frontend") || value.includes("widget") || value.includes("chat-ui")) {
    return "genai-frontend-lld";
  }
  if (/^(c|d)\d/.test(value) || /(rag|retrieval|embedding|prompt|eval|agent|semantic|knowledge-base|query-analytics)/.test(value)) {
    return "genai-backend-orchestration";
  }
  if (/(event|stream|queue|cache|matching|pricing|location|search|notification|payment|pipeline|distributed)/.test(value)) {
    return "distributed-systems";
  }
  return "backend-core";
}

function collectSeedSystemDesignDocs(): SeedSystemDesignDoc[] {
  let files: string[] = [];
  try {
    files = readdirSync(SYSTEM_DESIGN_DOCS_DIR).filter((entry) => entry.endsWith(".md")).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }

  const bySlug = new Map<string, SeedSystemDesignDoc>();
  for (const fileName of files) {
    const slug = fileSlug(fileName);
    if (!slug || bySlug.has(slug)) continue;
    const fullPath = path.join(SYSTEM_DESIGN_DOCS_DIR, fileName);
    const content = readFileSync(fullPath, "utf8");
    bySlug.set(slug, {
      title: humanizeSlug(slug),
      content,
      relativePath: path.relative(process.cwd(), fullPath),
      track: inferSystemTrackFromSlug(slug),
    });
  }

  return Array.from(bySlug.values());
}

function seedFrontendBank(db: Database.Database) {
  const timestamp = FRONTEND_MANIFEST.generatedAt || nowIso();

  for (const entry of FRONTEND_MANIFEST.entries) {
    const metadata = frontendMetadata(entry);
    const existing =
      entry.type === "LEETCODE"
        ? getLeetcodeItemMatch(db, entry.problemSlug ?? null, entry.problemLink ?? null, entry.title)
        : getItemByTypeTitle(db, entry.type, entry.title);

    const existingMetadata = existing ? parseMetadata(existing.metadata) : null;
    const previousGuide =
      existingMetadata && typeof existingMetadata.studyGuideMarkdown === "string" ? existingMetadata.studyGuideMarkdown : null;
    const canRefreshCanonicalNotes =
      Boolean(
        existing?.isShared &&
          (!existing.notesMarkdown.trim() ||
            normalizedMarkdown(existing.notesMarkdown) === normalizedMarkdown(previousGuide) ||
            normalizedMarkdown(existing.notesMarkdown) === normalizedMarkdown(entry.studyGuideMarkdown ?? entry.notesMarkdown))
      );

    const item: PrepItem = existing
      ? {
          ...existing,
          title: entry.title,
          tags: mergeTags(existing.tags, entry.tags),
          links: mergeLinks(existing.links, entry.links),
          notesMarkdown: canRefreshCanonicalNotes ? entry.notesMarkdown : existing.notesMarkdown,
          metadata: { ...parseMetadata(existing.metadata), ...metadata },
          updatedAt: timestamp,
        }
      : sanitizeTypeSpecificFields({
          ...defaultItem(randomUUID(), entry.type, timestamp),
          title: entry.title,
          type: entry.type,
          notesMarkdown: entry.notesMarkdown,
          tags: normalizeTags(entry.tags),
          links: dedupeLinks(entry.links),
          metadata,
          updatedAt: timestamp,
        });

    if (entry.type === "LEETCODE") {
      item.platform = entry.platform ?? "LeetCode";
      item.problemLink = entry.problemLink ?? item.problemLink;
      item.problemSlug = entry.problemSlug ?? item.problemSlug;
      item.pattern = entry.pattern ?? item.pattern;
      item.difficulty = entry.difficulty ?? item.difficulty;
      item.leetcodeOutcome = normalizeLeetcodeOutcomeValue(entry.leetcodeOutcome) ?? item.leetcodeOutcome ?? "TODO";
    }

    if (entry.type === "SYSTEM_DESIGN" || entry.type === "LLD") {
      item.systemTopic = entry.systemTopic ?? item.systemTopic ?? entry.title;
    }

    persistItem(db, item);
  }
}

function seedUberRankedLeetcode(db: Database.Database) {
  const timestamp = UBER_RANKED_IMPORT.capturedAt || nowIso();

  for (const problem of buildRankedProblems()) {
    const existing = getLeetcodeItemMatch(db, problem.slug, problem.link, humanizeSlug(problem.slug));
    const enrichment = getRankedLeetcodeEnrichment(problem.slug);
    const existingMetadata = parseMetadata(existing?.metadata);
    const existingWizardMetadata =
      existingMetadata.leetcodeWizard && typeof existingMetadata.leetcodeWizard === "object" && !Array.isArray(existingMetadata.leetcodeWizard)
        ? (existingMetadata.leetcodeWizard as Record<string, unknown>)
        : {};
    const metadata = buildRankedMetadata(
      {
        ...existingMetadata,
        ...(enrichment?.metadata
          ? {
              leetcodeWizard: {
                ...existingWizardMetadata,
                ...enrichment.metadata,
              },
            }
          : {}),
      },
      problem,
      timestamp
    );

    const nextItem: PrepItem = existing
      ? {
          ...existing,
          title: existing.title.trim() ? existing.title : enrichment?.title ?? humanizeSlug(problem.slug),
          notesMarkdown: existing.notesMarkdown.trim()
            ? existing.notesMarkdown
            : `# ${enrichment?.title ?? humanizeSlug(problem.slug)}\n\n- Source: Local Uber ranked import\n`,
          tags: mergeTags(existing.tags, ["leetcode", "uber", "company:uber", "source:leetcodewizard", ...(enrichment?.extraTags ?? [])]),
          links: mergeLinks(existing.links, [{ label: "Problem", url: problem.link }]),
          platform: existing.platform ?? "LeetCode",
          problemLink: problem.link,
          problemSlug: problem.slug,
          difficulty: existing.difficulty ?? enrichment?.difficulty ?? null,
          pattern: existing.pattern ?? enrichment?.pattern ?? null,
          metadata,
          updatedAt: timestamp,
        }
      : sanitizeTypeSpecificFields({
          ...defaultItem(randomUUID(), "LEETCODE", timestamp),
          title: enrichment?.title ?? humanizeSlug(problem.slug),
          type: "LEETCODE",
          notesMarkdown: `# ${enrichment?.title ?? humanizeSlug(problem.slug)}\n\n- Source: Local Uber ranked import\n`,
          tags: normalizeTags(["leetcode", "uber", "company:uber", "source:leetcodewizard", ...(enrichment?.extraTags ?? [])]),
          links: dedupeLinks([{ label: "Problem", url: enrichment?.link ?? problem.link }]),
          platform: "LeetCode",
          problemLink: enrichment?.link ?? problem.link,
          problemSlug: problem.slug,
          difficulty: enrichment?.difficulty ?? null,
          pattern: enrichment?.pattern ?? null,
          leetcodeOutcome: "TODO",
          metadata,
          updatedAt: timestamp,
        });

    persistItem(db, nextItem);
  }
}

function seedUberHackerRankDerived(db: Database.Database) {
  if (UBER_HACKERRANK_DERIVED_IMPORT.length === 0) return;
  const timestamp = nowIso();

  for (const row of UBER_HACKERRANK_DERIVED_IMPORT) {
    const existing = getLeetcodeItemMatch(db, row.leetcode_slug, row.leetcode_link, row.leetcode_title);
    const existingMetadata = parseMetadata(existing?.metadata);
    const previousMappings = Array.isArray(existingMetadata.uberHackerRankMappings) ? existingMetadata.uberHackerRankMappings : [];
    const nextMapping = {
      hackerrankTitle: row.hackerrank_title,
      hackerrankDifficulty: row.hackerrank_difficulty,
      hackerrankAccess: row.hackerrank_access,
      mappingQuality: row.mapping_quality,
      derivedStatement: row.derived_statement,
      capturedAt: timestamp,
    };
    const hasMapping = previousMappings.some((entry) => {
      if (!entry || typeof entry !== "object") return false;
      return String((entry as Record<string, unknown>).hackerrankTitle ?? "") === row.hackerrank_title;
    });

    const metadata = {
      ...existingMetadata,
      uberHackerRankMappings: hasMapping ? previousMappings : [...previousMappings, nextMapping],
      uberHackerRankSource: {
        source: "derived-analysis",
        importedAt: timestamp,
      },
      windowScope: "ONE_YEAR",
    };

    const notesMarkdown = [
      `# ${row.leetcode_title}`,
      "",
      "- Source: Uber HackerRank derived mapping",
      `- HackerRank title: ${row.hackerrank_title}`,
      `- Mapping quality: ${row.mapping_quality}`,
      `- Access status: ${row.hackerrank_access}`,
      "",
      "## Derived Prompt Angle",
      `- ${row.derived_statement}`,
    ].join("\n");

    const nextItem: PrepItem = existing
      ? {
          ...existing,
          title: existing.title.trim() ? existing.title : row.leetcode_title,
          notesMarkdown: existing.notesMarkdown.trim() ? existing.notesMarkdown : notesMarkdown,
          tags: mergeTags(existing.tags, [
            "leetcode",
            "uber",
            "hackerrank",
            "company:uber",
            "window:one-year",
            "source:uber-hackerrank-derived",
          ]),
          links: mergeLinks(existing.links, [{ label: "Problem", url: row.leetcode_link }]),
          platform: existing.platform ?? "LeetCode",
          problemLink: existing.problemLink ?? row.leetcode_link,
          problemSlug: existing.problemSlug ?? row.leetcode_slug,
          difficulty: existing.difficulty ?? row.hackerrank_difficulty,
          pattern: existing.pattern ?? row.pattern,
          metadata,
          updatedAt: timestamp,
        }
      : sanitizeTypeSpecificFields({
          ...defaultItem(randomUUID(), "LEETCODE", timestamp),
          title: row.leetcode_title,
          type: "LEETCODE",
          notesMarkdown,
          tags: normalizeTags([
            "leetcode",
            "uber",
            "hackerrank",
            "company:uber",
            "window:one-year",
            "source:uber-hackerrank-derived",
          ]),
          links: dedupeLinks([{ label: "Problem", url: row.leetcode_link }]),
          platform: "LeetCode",
          problemLink: row.leetcode_link,
          problemSlug: row.leetcode_slug,
          difficulty: row.hackerrank_difficulty,
          pattern: row.pattern,
          leetcodeOutcome: "TODO",
          metadata,
          updatedAt: timestamp,
        });

    persistItem(db, nextItem);
  }
}

function upsertItemDoc(db: Database.Database, itemId: string, content: string, updatedAt: string) {
  db.prepare(`
    insert into item_docs (item_id, content_markdown, checksum, updated_at)
    values (?, ?, ?, ?)
    on conflict(item_id) do update set
      content_markdown = excluded.content_markdown,
      checksum = excluded.checksum,
      updated_at = excluded.updated_at
  `).run(itemId, content, sha256(content), updatedAt);
}

function seedSystemDesignDocs(db: Database.Database) {
  const timestamp = nowIso();
  for (const doc of collectSeedSystemDesignDocs()) {
    const existing =
      getItemByCanonicalKey(
        db,
        toCanonicalKey({
          type: "SYSTEM_DESIGN",
          title: doc.title,
          problemLink: null,
          problemSlug: null,
          systemTopic: doc.title,
        }) ?? ""
      ) ?? getItemByTypeTitle(db, "SYSTEM_DESIGN", doc.title);

    const metadata = {
      ...parseMetadata(existing?.metadata),
      source: "local-system-design-doc",
      sdTrack: doc.track,
      sdMarkdownPath: doc.relativePath,
    };

    const nextItem: PrepItem = existing
      ? {
          ...existing,
          title: doc.title,
          systemTopic: existing.systemTopic ?? doc.title,
          tags: mergeTags(existing.tags, ["system-design", `track:${doc.track}`]),
          metadata,
          updatedAt: timestamp,
        }
      : sanitizeTypeSpecificFields({
          ...defaultItem(randomUUID(), "SYSTEM_DESIGN", timestamp),
          title: doc.title,
          type: "SYSTEM_DESIGN",
          notesMarkdown: [
            "## Practice Brief",
            `- Topic: ${doc.title}`,
            `- Track: ${doc.track}`,
            "",
            "## What to do",
            "- Read the full markdown design note in the System Design Markdown view.",
            "- Capture your own tradeoffs, failure modes, and follow-ups in the item notes.",
          ].join("\n"),
          tags: normalizeTags(["system-design", `track:${doc.track}`]),
          links: [],
          systemTopic: doc.title,
          metadata,
          updatedAt: timestamp,
        });

    const saved = persistItem(db, nextItem);
    const existingDoc = db.prepare("select item_id from item_docs where item_id = ?").get(saved.id) as { item_id: string } | undefined;
    if (!existingDoc) {
      upsertItemDoc(db, saved.id, doc.content, timestamp);
    }
  }
}

function defaultGoalDescription(): string {
  return "Local SQLite sprint seeded from the curated frontend bank, Uber-ranked LeetCode list, derived Uber HackerRank mappings, and system design markdown library.";
}

function uberScore(item: PrepItem): number {
  const metadata = parseMetadata(item.metadata);
  const companyFrequency = Array.isArray(metadata.companyFrequency) ? metadata.companyFrequency : [];
  for (const row of companyFrequency) {
    if (!row || typeof row !== "object") continue;
    const name = String((row as { name?: unknown }).name ?? "").toLowerCase();
    if (name === "uber") {
      return Number((row as { score?: unknown }).score ?? 0) || 0;
    }
  }
  return 0;
}

function seedDefaultGoal(db: Database.Database) {
  const existingGoalCount = db.prepare("select count(*) as count from goals").get() as { count: number };
  if ((existingGoalCount.count ?? 0) > 0) return;

  const items = getAllItemsLocal(db, false);
  const leetcodeItems = items
    .filter((item) => item.type === "LEETCODE")
    .sort((a, b) => uberScore(b) - uberScore(a) || difficultyRank(a.difficulty) - difficultyRank(b.difficulty) || a.title.localeCompare(b.title));
  const systemItems = items
    .filter((item) => item.type === "SYSTEM_DESIGN" || item.type === "LLD")
    .sort((a, b) => trackFromItem(a, "SYSTEM_DESIGN").localeCompare(trackFromItem(b, "SYSTEM_DESIGN")) || a.title.localeCompare(b.title));

  const selectedLeetcode = leetcodeItems.slice(0, Math.min(DEFAULT_LEETCODE_TARGET, leetcodeItems.length));
  const selectedSystem = systemItems.slice(0, Math.min(DEFAULT_SYSTEM_DESIGN_TARGET, systemItems.length));
  if (selectedLeetcode.length === 0 && selectedSystem.length === 0) return;

  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const endDate = new Date(now.getTime() + (DEFAULT_GOAL_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const timestamp = now.toISOString();

  const goal: GoalRecord = {
    id: randomUUID(),
    name: DEFAULT_GOAL_NAME,
    description: defaultGoalDescription(),
    startDate,
    endDate,
    leetcodeTarget: selectedLeetcode.length,
    systemDesignTarget: selectedSystem.length,
    dailyMinutesTarget: 150,
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  persistGoal(db, goal);
  ensureGoalDays(db, goal);

  const insertGoalItem = db.prepare("insert or ignore into goal_items (goal_id, item_id, module_kind, selected_at) values (?, ?, ?, ?)");
  for (const item of selectedLeetcode) {
    insertGoalItem.run(goal.id, item.id, "LEETCODE", timestamp);
  }
  for (const item of selectedSystem) {
    insertGoalItem.run(goal.id, item.id, "SYSTEM_DESIGN", timestamp);
  }
}

function ensureSeedData(db: Database.Database) {
  if (globalThis.__prepTrackerLocalDbSeeded__) return;
  const itemCount = db.prepare("select count(*) as count from items").get() as { count: number };
  const shouldBootstrap = (itemCount.count ?? 0) === 0;
  const seedTransaction = db.transaction(() => {
    seedFrontendBank(db);
    if (shouldBootstrap) {
      seedUberRankedLeetcode(db);
      seedUberHackerRankDerived(db);
      seedSystemDesignDocs(db);
      seedDefaultGoal(db);
    }
  });
  seedTransaction();
  globalThis.__prepTrackerLocalDbSeeded__ = true;
}

function backfillUberHackerRankDerivedInternal(db: Database.Database) {
  const tx = db.transaction(() => {
    seedUberHackerRankDerived(db);
  });
  tx();
}

function currentSrsState(item: PrepItem) {
  const metadata = parseMetadata(item.metadata);
  const rawSrs = metadata.srs;
  if (rawSrs && typeof rawSrs === "object" && !Array.isArray(rawSrs)) {
    const row = rawSrs as Record<string, unknown>;
    return {
      repetition: Math.max(0, Number(row.repetition ?? 0) || 0),
      intervalDays: Math.max(1, Number(row.intervalDays ?? item.reviewIntervalDays ?? 7) || 7),
      easeFactor: Math.max(1.3, Number(row.easeFactor ?? 2.5) || 2.5),
      lapses: Math.max(0, Number(row.lapses ?? 0) || 0),
    };
  }
  return {
    repetition: item.lastReviewedAt ? 1 : 0,
    intervalDays: Math.max(1, item.reviewIntervalDays || 7),
    easeFactor: 2.5,
    lapses: 0,
  };
}

function buildReviewLog(row: ReviewRow): ReviewLog {
  return {
    id: row.id,
    itemId: row.item_id,
    outcome: row.outcome,
    notesMarkdown: row.notes_markdown,
    previousReviewAt: row.previous_review_at,
    nextReviewAt: row.next_review_at,
    createdAt: row.created_at,
  };
}

function buildMockInterviewProgress(row: MockInterviewProgressRow): MockInterviewProgress {
  return {
    questionId: row.question_id,
    status: row.status,
    reviewCount: row.review_count,
    lastOutcome: row.last_outcome,
    lastReviewedAt: row.last_reviewed_at,
    completedAt: row.completed_at,
    notesMarkdown: row.notes_markdown,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildMockInterviewReviewLog(row: MockInterviewReviewRow): MockInterviewReviewLog {
  return {
    id: row.id,
    questionId: row.question_id,
    outcome: row.outcome,
    statusAfter: row.status_after,
    notesMarkdown: row.notes_markdown,
    createdAt: row.created_at,
  };
}

function buildFrontendFocusProgress(row: FrontendFocusProgressRow): FrontendFocusProgress {
  return {
    questionId: row.question_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getGoalDayEntriesByGoal(db: Database.Database, goalId: string) {
  const rows = db
    .prepare(`
      select e.*, i.title as item_title
      from goal_day_entries e
      join items i on i.id = e.item_id
      where e.goal_id = ?
      order by e.created_at asc
    `)
    .all(goalId) as GoalDayEntryJoinedRow[];

  const map = new Map<string, GoalDayEntry[]>();
  for (const row of rows) {
    const entries = map.get(row.goal_day_id) ?? [];
    entries.push({
      id: row.id,
      dayId: row.goal_day_id,
      goalId: row.goal_id,
      itemId: row.item_id,
      itemTitle: row.item_title,
      itemType: row.item_type,
      entryType: row.entry_type,
      createdAt: row.created_at,
    });
    map.set(row.goal_day_id, entries);
  }
  return map;
}

export async function listItems(params: { q?: string; type?: ItemType | "ALL"; includeDeleted?: boolean; dueOnly?: boolean; shouldReviewOnly?: boolean }) {
  const db = getDb();
  const query = params.q?.trim().toLowerCase() ?? "";
  return getAllItemsLocal(db, Boolean(params.includeDeleted))
    .filter((item) => (params.type && params.type !== "ALL" ? item.type === params.type : true))
    .filter((item) => (params.dueOnly ? Boolean(item.nextReviewAt) && safeTime(item.nextReviewAt) <= Date.now() : true))
    .filter((item) => (params.shouldReviewOnly ? item.shouldReviewAgain : true))
    .filter((item) => (query ? searchTextForItem(item).includes(query) : true))
    .sort(compareItems);
}

export async function listMockInterviewProgress() {
  const db = getDb();
  const rows = db
    .prepare("select * from mock_interview_progress order by updated_at desc, question_id asc")
    .all() as MockInterviewProgressRow[];
  return rows.map(buildMockInterviewProgress);
}

export async function listFrontendFocusProgress() {
  const db = getDb();
  const rows = db
    .prepare("select * from frontend_focus_progress order by updated_at desc, question_id asc")
    .all() as FrontendFocusProgressRow[];
  return rows.map(buildFrontendFocusProgress);
}

export async function getFrontendFocusProgress(questionId: string) {
  const db = getDb();
  const row = db
    .prepare("select * from frontend_focus_progress where question_id = ?")
    .get(questionId) as FrontendFocusProgressRow | undefined;
  return row ? buildFrontendFocusProgress(row) : null;
}

export async function upsertFrontendFocusProgress(questionId: string, input: FrontendFocusProgressUpdateInput) {
  const db = getDb();
  const existing = await getFrontendFocusProgress(questionId);
  const timestamp = nowIso();

  db.prepare(`
    insert into frontend_focus_progress (question_id, status, created_at, updated_at)
    values (?, ?, ?, ?)
    on conflict(question_id) do update set
      status = excluded.status,
      updated_at = excluded.updated_at
  `).run(questionId, input.status, existing?.createdAt ?? timestamp, timestamp);

  return getFrontendFocusProgress(questionId);
}

export async function getMockInterviewProgress(questionId: string) {
  const db = getDb();
  const row = db
    .prepare("select * from mock_interview_progress where question_id = ?")
    .get(questionId) as MockInterviewProgressRow | undefined;
  return row ? buildMockInterviewProgress(row) : null;
}

export async function listMockInterviewReviews(questionId: string) {
  const db = getDb();
  const rows = db
    .prepare("select * from mock_interview_reviews where question_id = ? order by created_at desc")
    .all(questionId) as MockInterviewReviewRow[];
  return rows.map(buildMockInterviewReviewLog);
}

export async function upsertMockInterviewProgress(questionId: string, input: MockInterviewProgressUpdateInput) {
  const db = getDb();
  const existing = await getMockInterviewProgress(questionId);
  const timestamp = nowIso();
  const completedAt = input.status === "COMPLETED" ? existing?.completedAt ?? timestamp : null;

  db.prepare(`
    insert into mock_interview_progress (
      question_id, status, review_count, last_outcome, last_reviewed_at, completed_at, notes_markdown, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(question_id) do update set
      status = excluded.status,
      completed_at = excluded.completed_at,
      notes_markdown = excluded.notes_markdown,
      updated_at = excluded.updated_at
  `).run(
    questionId,
    input.status,
    existing?.reviewCount ?? 0,
    existing?.lastOutcome ?? null,
    existing?.lastReviewedAt ?? null,
    completedAt,
    input.notesMarkdown ?? existing?.notesMarkdown ?? "",
    existing?.createdAt ?? timestamp,
    timestamp
  );

  return getMockInterviewProgress(questionId);
}

export async function addMockInterviewReview(questionId: string, input: MockInterviewReviewInput) {
  const db = getDb();
  const existing = await getMockInterviewProgress(questionId);
  const timestamp = nowIso();
  const completedAt = input.statusAfter === "COMPLETED" ? existing?.completedAt ?? timestamp : null;

  db.prepare(`
    insert into mock_interview_reviews (id, question_id, outcome, status_after, notes_markdown, created_at)
    values (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), questionId, input.outcome, input.statusAfter, input.notesMarkdown ?? "", timestamp);

  db.prepare(`
    insert into mock_interview_progress (
      question_id, status, review_count, last_outcome, last_reviewed_at, completed_at, notes_markdown, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(question_id) do update set
      status = excluded.status,
      review_count = excluded.review_count,
      last_outcome = excluded.last_outcome,
      last_reviewed_at = excluded.last_reviewed_at,
      completed_at = excluded.completed_at,
      notes_markdown = excluded.notes_markdown,
      updated_at = excluded.updated_at
  `).run(
    questionId,
    input.statusAfter,
    (existing?.reviewCount ?? 0) + 1,
    input.outcome,
    timestamp,
    completedAt,
    input.notesMarkdown ?? existing?.notesMarkdown ?? "",
    existing?.createdAt ?? timestamp,
    timestamp
  );

  return {
    progress: await getMockInterviewProgress(questionId),
    reviews: await listMockInterviewReviews(questionId),
  };
}

export async function backfillUberHackerRankDerived() {
  const db = getDb();
  backfillUberHackerRankDerivedInternal(db);
  return {
    ok: true,
    importedCount: UBER_HACKERRANK_DERIVED_IMPORT.length,
  };
}

export async function getItem(id: string) {
  const db = getDb();
  return getItemByIdLocal(db, id);
}

export async function getReviewsForItem(itemId: string) {
  const db = getDb();
  const rows = db
    .prepare("select id, item_id, outcome, notes_markdown, previous_review_at, next_review_at, created_at from review_logs where item_id = ? order by created_at desc")
    .all(itemId) as ReviewRow[];
  return rows.map(buildReviewLog);
}

export async function createItem(input: ItemCreateInput) {
  const db = getDb();
  const timestamp = nowIso();
  const item = sanitizeTypeSpecificFields({
    ...defaultItem(randomUUID(), input.type, timestamp),
    ...input,
    id: randomUUID(),
    ownerUserId: null,
    isShared: false,
    tags: normalizeTags(input.tags),
    links: dedupeLinks(input.links),
    metadata: parseMetadata(input.metadata),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  ensureNoDuplicate(db, item);
  const saved = persistItem(db, item);
  logChange(db, "CREATE", saved.id, { title: saved.title, type: saved.type });

  if ((saved.type === "SYSTEM_DESIGN" || saved.type === "LLD") && saved.notesMarkdown.trim()) {
    upsertItemDoc(db, saved.id, saved.notesMarkdown, timestamp);
  }

  return saved;
}

export async function updateItem(id: string, input: ItemUpdateInput) {
  const db = getDb();
  const existing = getItemByIdLocal(db, id);
  if (!existing) return null;

  const updated: PrepItem = sanitizeTypeSpecificFields({
    ...existing,
    ...input,
    tags: input.tags ? normalizeTags(input.tags) : existing.tags,
    links: input.links ? dedupeLinks(input.links) : existing.links,
    metadata: input.metadata ? parseMetadata(input.metadata) : existing.metadata,
    updatedAt: nowIso(),
  });

  ensureNoDuplicate(db, updated, existing.id);
  const saved = persistItem(db, updated);
  logChange(db, "UPDATE", saved.id, { title: saved.title });
  return saved;
}

export async function softDeleteItem(id: string) {
  const db = getDb();
  const existing = getItemByIdLocal(db, id);
  if (!existing) return null;

  const updated: PrepItem = {
    ...existing,
    deletedAt: nowIso(),
    state: existing.state === "ARCHIVED" ? existing.state : "ARCHIVED",
    updatedAt: nowIso(),
  };
  const saved = persistItem(db, updated);
  logChange(db, "DELETE", saved.id, { title: saved.title });
  return saved;
}

export async function restoreItem(id: string) {
  const db = getDb();
  const existing = getItemByIdLocal(db, id);
  if (!existing) return null;

  const updated: PrepItem = {
    ...existing,
    deletedAt: null,
    state: existing.state === "ARCHIVED" ? "ACTIVE" : existing.state,
    updatedAt: nowIso(),
  };
  const saved = persistItem(db, updated);
  logChange(db, "RESTORE", saved.id, { title: saved.title });
  return saved;
}

export async function hardDeleteItem(id: string) {
  const db = getDb();
  const item = getItemByIdLocal(db, id);
  if (!item) return false;
  logChange(db, "HARD_DELETE", id, { title: item.title, type: item.type });
  const result = db.prepare("delete from items where id = ?").run(id);
  return result.changes > 0;
}

export async function addReview(itemId: string, input: ReviewInput, _goalId?: string) {
  const db = getDb();
  const item = getItemByIdLocal(db, itemId);
  if (!item) return null;

  const timestamp = nowIso();
  const quality = outcomeToQuality(input.outcome);
  const nextState = sm2NextState(currentSrsState(item), quality);
  const nextIntervalDays = input.outcome === "AGAIN"
    ? 1
    : Math.max(computeNextIntervalDays(item.reviewIntervalDays || nextState.intervalDays, input.outcome), nextState.intervalDays);
  const nextReviewAt = nextReviewFromNow(nextIntervalDays);

  const metadata = parseMetadata(item.metadata);
  metadata.srs = { ...nextState, intervalDays: nextIntervalDays };

  const updated: PrepItem = {
    ...item,
    metadata,
    shouldReviewAgain: true,
    reviewIntervalDays: nextIntervalDays,
    lastReviewedAt: timestamp,
    nextReviewAt,
    updatedAt: timestamp,
  };

  if (updated.type !== "LEETCODE" && input.outcome !== "AGAIN") {
    updated.state = "DONE";
  }

  const saved = persistItem(db, updated);
  const review: ReviewLog = {
    id: randomUUID(),
    itemId,
    outcome: input.outcome,
    notesMarkdown: input.notesMarkdown ?? "",
    previousReviewAt: item.lastReviewedAt,
    nextReviewAt,
    createdAt: timestamp,
  };

  db.prepare(`
    insert into review_logs (
      id, item_id, goal_id, outcome, quality, notes_markdown, previous_review_at,
      next_review_at, interval_before, interval_after, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    review.id,
    review.itemId,
    _goalId ?? null,
    review.outcome,
    quality,
    review.notesMarkdown,
    review.previousReviewAt,
    review.nextReviewAt,
    Math.max(0, item.reviewIntervalDays),
    nextIntervalDays,
    review.createdAt
  );

  logChange(db, "REVIEW", itemId, { outcome: review.outcome, nextReviewAt });
  return { item: saved, review };
}

export async function listBankItems(kind: "LEETCODE" | "SYSTEM_DESIGN", q?: string) {
  const db = getDb();
  const query = q?.trim().toLowerCase() ?? "";
  return getAllItemsLocal(db, false)
    .filter((item) => {
      if (kind === "LEETCODE") return item.type === "LEETCODE";
      return item.type === "SYSTEM_DESIGN" || item.type === "LLD";
    })
    .filter((item) => (query ? searchTextForItem(item).includes(query) : true))
    .sort(compareItems);
}

export async function listGoalRecords() {
  const db = getDb();
  const rows = db
    .prepare("select * from goals order by case when status = 'ACTIVE' then 0 when status = 'PAUSED' then 1 else 2 end, updated_at desc, name asc")
    .all() as GoalRow[];
  return rows.map(rowToGoal);
}

export async function getGoalRecord(goalId: string) {
  const db = getDb();
  const row = getGoalRowById(db, goalId);
  return row ? rowToGoal(row) : null;
}

export async function createGoalRecord(input: GoalCreateInput) {
  const db = getDb();
  const timestamp = nowIso();
  const goal: GoalRecord = {
    id: randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    startDate: input.startDate,
    endDate: input.endDate,
    leetcodeTarget: input.leetcodeTarget,
    systemDesignTarget: input.systemDesignTarget,
    dailyMinutesTarget: input.dailyMinutesTarget,
    status: input.status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  persistGoal(db, goal);
  ensureGoalDays(db, goal);
  return goal;
}

export async function updateGoalRecord(goalId: string, input: GoalUpdateInput) {
  const db = getDb();
  const existing = await getGoalRecord(goalId);
  if (!existing) return null;

  const goal: GoalRecord = {
    ...existing,
    ...input,
    name: input.name?.trim() ?? existing.name,
    description: input.description?.trim() ?? existing.description,
    updatedAt: nowIso(),
  };
  persistGoal(db, goal);
  ensureGoalDays(db, goal);
  return goal;
}

export async function deleteGoalRecord(goalId: string) {
  const db = getDb();
  const result = db.prepare("delete from goals where id = ?").run(goalId);
  return result.changes > 0;
}

export async function listGoalItems(goalId: string) {
  const db = getDb();
  if (!getGoalRowById(db, goalId)) return [];
  const rows = db
    .prepare("select goal_id, item_id, module_kind, selected_at from goal_items where goal_id = ? order by selected_at asc")
    .all(goalId) as Array<{ goal_id: string; item_id: string; module_kind: GoalModuleKind; selected_at: string }>;

  const records: GoalItemRecord[] = [];
  for (const row of rows) {
    const item = getItemByIdLocal(db, row.item_id);
    if (!item || item.deletedAt) continue;
    records.push({
      goalId: row.goal_id,
      itemId: row.item_id,
      moduleKind: row.module_kind,
      selectedAt: row.selected_at,
      item,
    });
  }

  return records;
}

export async function addItemToGoal(goalId: string, itemId: string) {
  const db = getDb();
  const goal = getGoalRowById(db, goalId);
  const item = getItemByIdLocal(db, itemId);
  if (!goal || !item) return null;

  db.prepare("insert or ignore into goal_items (goal_id, item_id, module_kind, selected_at) values (?, ?, ?, ?)")
    .run(goalId, itemId, guessModuleKind(item), nowIso());

  const rows = await listGoalItems(goalId);
  return rows.find((entry) => entry.itemId === itemId) ?? null;
}

export async function removeItemFromGoal(goalId: string, itemId: string) {
  const db = getDb();
  const result = db.prepare("delete from goal_items where goal_id = ? and item_id = ?").run(goalId, itemId);
  return result.changes > 0;
}

export async function listGoalTargets(goalId: string) {
  const db = getDb();
  if (!getGoalRowById(db, goalId)) return null;
  const rows = db
    .prepare("select * from goal_targets where goal_id = ? order by module_kind asc, dimension asc, bucket_key asc")
    .all(goalId) as GoalTargetRow[];
  return rows.map((row) => ({
    goalId: row.goal_id,
    moduleKind: row.module_kind,
    dimension: row.dimension,
    bucketKey: row.bucket_key,
    targetCount: row.target_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertGoalTarget(goalId: string, input: GoalTargetUpsertInput) {
  const db = getDb();
  if (!getGoalRowById(db, goalId)) return null;
  const timestamp = nowIso();
  db.prepare(`
    insert into goal_targets (goal_id, module_kind, dimension, bucket_key, target_count, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?)
    on conflict(goal_id, module_kind, dimension, bucket_key) do update set
      target_count = excluded.target_count,
      updated_at = excluded.updated_at
  `).run(goalId, input.moduleKind, input.dimension, normalizeBucketKey(input.bucketKey), input.targetCount, timestamp, timestamp);
  return listGoalTargets(goalId);
}

export async function replaceGoalTargets(goalId: string, input: GoalTargetReplaceInput) {
  const db = getDb();
  if (!getGoalRowById(db, goalId)) return null;
  const timestamp = nowIso();
  const transaction = db.transaction(() => {
    db.prepare("delete from goal_targets where goal_id = ? and module_kind = ? and dimension = ?")
      .run(goalId, input.moduleKind, input.dimension);
    const insert = db.prepare(`
      insert into goal_targets (goal_id, module_kind, dimension, bucket_key, target_count, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const target of input.targets) {
      insert.run(goalId, input.moduleKind, input.dimension, normalizeBucketKey(target.bucketKey), target.targetCount, timestamp, timestamp);
    }
  });
  transaction();
  return listGoalTargets(goalId);
}

export async function deleteGoalTarget(goalId: string, input: GoalTargetDeleteInput) {
  const db = getDb();
  const result = db
    .prepare("delete from goal_targets where goal_id = ? and module_kind = ? and dimension = ? and bucket_key = ?")
    .run(goalId, input.moduleKind, input.dimension, normalizeBucketKey(input.bucketKey));
  return result.changes > 0;
}

export async function createGoalSession(goalId: string, input: GoalSessionCreateInput): Promise<GoalSessionRecord | null> {
  const db = getDb();
  const goal = getGoalRowById(db, goalId);
  const item = getItemByIdLocal(db, input.itemId);
  if (!goal || !item) return null;

  const timestamp = input.sessionAt ?? nowIso();
  const createdAt = nowIso();
  const sessionId = randomUUID();
  db.prepare(`
    insert into goal_sessions (
      id, goal_id, item_id, module_kind, action, session_at, minutes_spent, notes_markdown, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, goalId, item.id, input.moduleKind, input.action, timestamp, input.minutesSpent ?? 0, input.notesMarkdown ?? "", createdAt, createdAt);

  const updatedItem = applyGoalSessionItemUpdates({ ...item }, input, timestamp);
  persistItem(db, updatedItem);

  const sessionDate = timestamp.slice(0, 10);
  db.prepare("update goal_days set actual_minutes = actual_minutes + ?, updated_at = ? where goal_id = ? and date = ?")
    .run(Math.max(0, input.minutesSpent ?? 0), createdAt, goalId, sessionDate);

  if (input.reviewOutcome) {
    await addReview(item.id, { outcome: input.reviewOutcome, notesMarkdown: input.notesMarkdown ?? "", goalId }, goalId);
  }

  return {
    id: sessionId,
    goalId,
    moduleKind: input.moduleKind,
    itemId: item.id,
    itemTitle: updatedItem.title,
    action: input.action,
    sessionAt: timestamp,
    minutesSpent: Math.max(0, input.minutesSpent ?? 0),
    notesMarkdown: input.notesMarkdown ?? "",
    createdAt,
    updatedAt: createdAt,
  };
}

export async function listGoalSessions(goalId: string, limit = 30) {
  const db = getDb();
  if (!getGoalRowById(db, goalId)) return null;
  const rows = db
    .prepare(`
      select s.*, i.title as item_title
      from goal_sessions s
      join items i on i.id = s.item_id
      where s.goal_id = ?
      order by s.session_at desc, s.created_at desc
      limit ?
    `)
    .all(goalId, Math.max(1, limit)) as Array<GoalSessionRow & { item_title: string }>;

  return rows.map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    moduleKind: row.module_kind,
    itemId: row.item_id,
    itemTitle: row.item_title,
    action: row.action,
    sessionAt: row.session_at,
    minutesSpent: row.minutes_spent,
    notesMarkdown: row.notes_markdown,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function deleteGoalSession(goalId: string, sessionId: string) {
  const db = getDb();
  const row = db
    .prepare("select goal_id, session_at, minutes_spent from goal_sessions where id = ? and goal_id = ?")
    .get(sessionId, goalId) as { goal_id: string; session_at: string; minutes_spent: number } | undefined;
  if (!row) return false;

  const deleted = db.prepare("delete from goal_sessions where id = ? and goal_id = ?").run(sessionId, goalId);
  if (deleted.changes > 0) {
    db.prepare("update goal_days set actual_minutes = max(0, actual_minutes - ?), updated_at = ? where goal_id = ? and date = ?")
      .run(Math.max(0, row.minutes_spent), nowIso(), goalId, row.session_at.slice(0, 10));
  }
  return deleted.changes > 0;
}

export async function listGoalDays(goalId: string) {
  const db = getDb();
  if (!getGoalRowById(db, goalId)) return [];
  const entryMap = getGoalDayEntriesByGoal(db, goalId);
  const rows = db.prepare("select * from goal_days where goal_id = ? order by date asc").all(goalId) as GoalDayRow[];
  return rows.map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    date: row.date,
    status: row.status,
    plannedMinutes: row.planned_minutes,
    actualMinutes: row.actual_minutes,
    notes: row.notes,
    entries: entryMap.get(row.id) ?? [],
  }));
}

export async function updateGoalDay(dayId: string, input: GoalDayUpdateInput) {
  const db = getDb();
  const row = db.prepare("select * from goal_days where id = ?").get(dayId) as GoalDayRow | undefined;
  if (!row) return null;
  const next: GoalDayRow = {
    ...row,
    status: input.status ?? row.status,
    planned_minutes: input.plannedMinutes ?? row.planned_minutes,
    actual_minutes: input.actualMinutes ?? row.actual_minutes,
    notes: input.notes ?? row.notes,
  };
  db.prepare(`
    update goal_days
    set status = ?, planned_minutes = ?, actual_minutes = ?, notes = ?, updated_at = ?
    where id = ?
  `).run(next.status, next.planned_minutes, next.actual_minutes, next.notes, nowIso(), dayId);
  const days = await listGoalDays(row.goal_id);
  return days.find((day) => day.id === dayId) ?? null;
}

export async function addGoalDayEntry(dayId: string, input: { itemId: string; entryType: "LEETCODE_SOLVED" | "SYSTEM_DESIGN_READ" }) {
  const db = getDb();
  const day = db.prepare("select * from goal_days where id = ?").get(dayId) as GoalDayRow | undefined;
  const item = getItemByIdLocal(db, input.itemId);
  if (!day || !item) return null;
  const entryId = randomUUID();
  db.prepare(`
    insert or ignore into goal_day_entries (id, goal_day_id, goal_id, item_id, item_type, entry_type, created_at)
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(entryId, dayId, day.goal_id, item.id, guessModuleKind(item), input.entryType, nowIso());
  const days = await listGoalDays(day.goal_id);
  return days.find((entry) => entry.id === dayId) ?? null;
}

export async function removeGoalDayEntry(dayId: string, entryId: string) {
  const db = getDb();
  const day = db.prepare("select goal_id from goal_days where id = ?").get(dayId) as { goal_id: string } | undefined;
  if (!day) return false;
  const result = db.prepare("delete from goal_day_entries where id = ? and goal_day_id = ?").run(entryId, dayId);
  return result.changes > 0;
}

export async function getGoalProgress(goalId: string): Promise<GoalProgress | null> {
  const goal = await getGoalRecord(goalId);
  if (!goal) return null;

  const selectedItems = await listGoalItems(goalId);
  const targets = (await listGoalTargets(goalId)) ?? [];
  const sessions = (await listGoalSessions(goalId, 500)) ?? [];

  const selectedLeetcode = selectedItems.filter((entry) => entry.moduleKind === "LEETCODE");
  const selectedSystem = selectedItems.filter((entry) => entry.moduleKind === "SYSTEM_DESIGN");
  const doneLeetcode = selectedLeetcode.filter((entry) => entry.item.leetcodeOutcome === "SOLVED").length;
  const doneSystem = selectedSystem.filter((entry) => entry.item.state === "DONE").length;
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const dueReviews = selectedItems
    .filter((entry) => entry.item.shouldReviewAgain && Boolean(entry.item.nextReviewAt) && safeTime(entry.item.nextReviewAt) <= now)
    .map((entry) => ({
      itemId: entry.itemId,
      title: entry.item.title,
      moduleKind: entry.moduleKind,
      dueAt: entry.item.nextReviewAt as string,
    }))
    .sort((a, b) => safeTime(a.dueAt) - safeTime(b.dueAt));

  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutesSpent, 0);
  const last7d = sessions.filter((session) => safeTime(session.sessionAt) >= weekAgo);
  const progress = computeProgressSnapshot(
    selectedItems.map((entry) => entry.item),
    {
      leetcodeTarget: goal.leetcodeTarget,
      systemDesignTarget: goal.systemDesignTarget,
      targetDate: goal.endDate,
    }
  );

  return {
    goal,
    selected: {
      leetcode: selectedLeetcode.length,
      systemDesign: selectedSystem.length,
      total: selectedItems.length,
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
      totalSessions: sessions.length,
      totalMinutes,
      last7dSessions: last7d.length,
      last7dMinutes: last7d.reduce((sum, session) => sum + session.minutesSpent, 0),
      lastActivityAt: sessions[0]?.sessionAt ?? null,
    },
    progress,
  };
}

export async function getSystemDesignMarkdown(itemId: string): Promise<SystemDesignMarkdownDoc | null> {
  const db = getDb();
  const item = getItemByIdLocal(db, itemId);
  if (!item || (item.type !== "SYSTEM_DESIGN" && item.type !== "LLD")) return null;

  const row = db.prepare("select * from item_docs where item_id = ?").get(itemId) as { item_id: string; content_markdown: string; checksum: string; updated_at: string } | undefined;
  const metadata = parseMetadata(item.metadata);
  const pathLabel = typeof metadata.sdMarkdownPath === "string" ? metadata.sdMarkdownPath : `db://system-design/${itemId}`;

  if (!row) {
    const content = item.notesMarkdown || `# ${item.title}\n`;
    upsertItemDoc(db, itemId, content, nowIso());
    return getSystemDesignMarkdown(itemId);
  }

  return {
    itemId,
    path: pathLabel,
    content: row.content_markdown,
    checksum: row.checksum,
    updatedAt: row.updated_at,
  };
}

export async function saveSystemDesignMarkdown(itemId: string, input: MarkdownSaveInput): Promise<SystemDesignMarkdownDoc | null> {
  const db = getDb();
  const current = await getSystemDesignMarkdown(itemId);
  if (!current) return null;
  if (input.expectedChecksum && input.expectedChecksum !== current.checksum) {
    throw new MarkdownConflictError("Markdown document changed since you loaded it", current);
  }

  const updatedAt = nowIso();
  upsertItemDoc(db, itemId, input.content, updatedAt);
  const item = getItemByIdLocal(db, itemId);
  if (item) {
    persistItem(db, { ...item, updatedAt });
  }
  return getSystemDesignMarkdown(itemId);
}

export async function ingestAgentContent(input: AgentIngestInput) {
  const db = getDb();
  const itemType: ItemType = input.type === "LEETCODE" ? "LEETCODE" : "SYSTEM_DESIGN";
  const candidateTitle = input.title.trim();
  const existing =
    itemType === "LEETCODE"
      ? getLeetcodeItemMatch(db, input.problemSlug ?? null, input.problemLink ?? null, candidateTitle)
      : getItemByTypeTitle(db, "SYSTEM_DESIGN", candidateTitle);

  const basePayload: PrepItem = existing
    ? {
        ...existing,
        title: candidateTitle,
        notesMarkdown: input.notesMarkdown?.trim() ? input.notesMarkdown : existing.notesMarkdown,
        tags: mergeTags(existing.tags, input.tags),
        updatedAt: nowIso(),
      }
    : sanitizeTypeSpecificFields({
        ...defaultItem(randomUUID(), itemType, nowIso()),
        title: candidateTitle,
        type: itemType,
        notesMarkdown: input.notesMarkdown ?? "",
        tags: normalizeTags(input.tags),
        links: input.problemLink ? dedupeLinks([{ label: "Problem", url: input.problemLink }]) : [],
        updatedAt: nowIso(),
      });

  if (itemType === "LEETCODE") {
    basePayload.platform = "LeetCode";
    basePayload.problemLink = input.problemLink ?? basePayload.problemLink;
    basePayload.problemSlug = input.problemSlug ?? basePayload.problemSlug;
    basePayload.pattern = input.pattern ?? basePayload.pattern;
    basePayload.difficulty = input.difficulty ?? basePayload.difficulty;
    basePayload.leetcodeOutcome = basePayload.leetcodeOutcome ?? "TODO";
  } else {
    basePayload.systemTopic = input.systemTopic ?? basePayload.systemTopic ?? candidateTitle;
  }

  ensureNoDuplicate(db, basePayload, existing?.id);
  const saved = persistItem(db, basePayload);

  if ((saved.type === "SYSTEM_DESIGN" || saved.type === "LLD") && input.markdownContent?.trim()) {
    await saveSystemDesignMarkdown(saved.id, { content: input.markdownContent });
  }

  let attachedGoal: GoalRecord | null = null;
  if (input.goalName?.trim()) {
    const existingGoal = (await listGoalRecords()).find((goal) => goal.name.toLowerCase() === input.goalName!.trim().toLowerCase()) ?? null;
    attachedGoal =
      existingGoal ??
      (await createGoalRecord({
        name: input.goalName.trim(),
        description: "Created from agent ingest",
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        leetcodeTarget: itemType === "LEETCODE" ? 1 : 0,
        systemDesignTarget: itemType === "SYSTEM_DESIGN" ? 1 : 0,
        dailyMinutesTarget: 90,
        status: "ACTIVE",
      }));
    await addItemToGoal(attachedGoal.id, saved.id);
  }

  if (input.reviewOutcome) {
    await addReview(saved.id, { outcome: input.reviewOutcome, notesMarkdown: input.notesMarkdown ?? "" });
  }

  return {
    item: await getItem(saved.id),
    goal: attachedGoal,
  };
}
