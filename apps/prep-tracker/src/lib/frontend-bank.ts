import manifestJson from "../../data/frontend-bank/uber-frontend-bank.json";
import type { PrepItem } from "@/lib/types";

export const FRONTEND_SURFACE = "uber-frontend" as const;
export const FRONTEND_TAB_ORDER = ["js-async", "react-browser", "frontend-coding", "dsa", "design-behavior"] as const;
export const FRONTEND_STATUS_FILTERS = ["ALL", "NOT_STARTED", "DUE", "SCHEDULED", "DONE"] as const;
export const FRONTEND_SOURCE_FILTERS = ["ALL", "CONCEPT", "REPORTED", "RECOVERY"] as const;

export type FrontendTabKey = (typeof FRONTEND_TAB_ORDER)[number];
export type FrontendStatusFilter = (typeof FRONTEND_STATUS_FILTERS)[number];
export type FrontendSourceFilter = (typeof FRONTEND_SOURCE_FILTERS)[number];
export type FrontendEntryKind = "concept" | "reported-question" | "recovery-drill";
export type FrontendPriority = "mvp" | "core" | "stretch";
export type FrontendItemStatus = Exclude<FrontendStatusFilter, "ALL">;

export type FrontendManifestSource = {
  label: string;
  url: string;
};

export type FrontendStartHereBlock = {
  title: string;
  itemIds: string[];
  exitCriteria: string;
};

export type FrontendManifestTab = {
  label: string;
  description: string;
  startHere: FrontendStartHereBlock[];
};

export type FrontendManifestEntry = {
  seedKey: string;
  bankId: string;
  title: string;
  type: string;
  frontendTab: FrontendTabKey;
  entryKind: FrontendEntryKind;
  conceptCluster: string;
  roundTag: string;
  priority: FrontendPriority;
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
  platform?: string;
  problemSlug?: string | null;
  problemLink?: string | null;
  pattern?: string | null;
  leetcodeOutcome?: string | null;
  systemTopic?: string | null;
};

export type FrontendManifest = {
  surface: typeof FRONTEND_SURFACE;
  generatedAt: string;
  sources: Record<string, FrontendManifestSource>;
  tabs: Record<FrontendTabKey, FrontendManifestTab>;
  entries: FrontendManifestEntry[];
};

export type FrontendItemMeta = {
  surface: string;
  frontendTab: FrontendTabKey;
  entryKind: FrontendEntryKind;
  conceptCluster: string;
  roundTag: string;
  priority: FrontendPriority;
  seedKey: string;
  bankId: string | null;
  sourceRefs: FrontendManifestSource[];
  difficulty: string | null;
  timebox: string | null;
  level: string | null;
  whyItMatters: string | null;
  expectedShape: string | null;
  studyGuideMarkdown: string | null;
  reportedContext: string | null;
  reportedPrompt: string | null;
  practicePrompt: string | null;
};

export type FrontendBankItem = {
  item: PrepItem;
  meta: FrontendItemMeta;
  completedAt: string | null;
  status: FrontendItemStatus;
  isDue: boolean;
  isOverdue: boolean;
  sourceKind: Exclude<FrontendSourceFilter, "ALL">;
};

export type FrontendBankGroup = {
  conceptCluster: string;
  items: FrontendBankItem[];
};

export type FrontendBankSummary = {
  total: number;
  dueToday: number;
  completed: number;
  overdue: number;
};

export type FrontendBankTabStat = FrontendBankSummary & {
  key: FrontendTabKey;
  label: string;
};

export type FrontendBankResponse = {
  summary: FrontendBankSummary;
  tabs: FrontendBankTabStat[];
  activeTab: {
    key: FrontendTabKey;
    label: string;
    description: string;
    startHere: Array<FrontendStartHereBlock & { items: Array<{ bankId: string; title: string | null }> }>;
    groups: FrontendBankGroup[];
    availableRounds: string[];
    availableDifficulties: string[];
  };
  filters: {
    tab: FrontendTabKey;
    status: FrontendStatusFilter;
    source: FrontendSourceFilter;
    difficulty: string;
    round: string;
    q: string;
    dueOnly: boolean;
  };
};

export const FRONTEND_BANK_MANIFEST = manifestJson as FrontendManifest;
export const FRONTEND_BANK_ENTRY_BY_ID = new Map(FRONTEND_BANK_MANIFEST.entries.map((entry) => [entry.bankId, entry]));

export function isFrontendTabKey(value: string | null | undefined): value is FrontendTabKey {
  return Boolean(value) && FRONTEND_TAB_ORDER.includes(value as FrontendTabKey);
}

export function normalizeFrontendTab(value: string | null | undefined): FrontendTabKey {
  return isFrontendTabKey(value) ? value : "js-async";
}

export function isFrontendStatusFilter(value: string | null | undefined): value is FrontendStatusFilter {
  return Boolean(value) && FRONTEND_STATUS_FILTERS.includes(value as FrontendStatusFilter);
}

export function normalizeFrontendStatusFilter(value: string | null | undefined): FrontendStatusFilter {
  return isFrontendStatusFilter(value) ? value : "ALL";
}

export function isFrontendSourceFilter(value: string | null | undefined): value is FrontendSourceFilter {
  return Boolean(value) && FRONTEND_SOURCE_FILTERS.includes(value as FrontendSourceFilter);
}

export function normalizeFrontendSourceFilter(value: string | null | undefined): FrontendSourceFilter {
  return isFrontendSourceFilter(value) ? value : "ALL";
}

export function normalizeDifficultyFilter(value: string | null | undefined): string {
  return (value ?? "ALL").trim() || "ALL";
}

export function normalizeRoundFilter(value: string | null | undefined): string {
  return (value ?? "ALL").trim() || "ALL";
}

export function frontendCompletedAt(item: PrepItem): string | null {
  if (item.type === "LEETCODE") {
    return item.lastSolvedAt ?? item.lastReviewedAt ?? null;
  }
  return item.lastReviewedAt ?? null;
}

export function frontendItemStatus(item: PrepItem): FrontendItemStatus {
  const completedAt = frontendCompletedAt(item);
  if (!completedAt) return "NOT_STARTED";

  if (item.nextReviewAt) {
    const nextMs = new Date(item.nextReviewAt).getTime();
    if (Number.isFinite(nextMs) && nextMs <= Date.now()) {
      return "DUE";
    }
    return "SCHEDULED";
  }

  return "DONE";
}

export function frontendSourceKind(entryKind: FrontendEntryKind): Exclude<FrontendSourceFilter, "ALL"> {
  if (entryKind === "concept") return "CONCEPT";
  if (entryKind === "reported-question") return "REPORTED";
  return "RECOVERY";
}

export function frontendMeta(item: PrepItem): FrontendItemMeta | null {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  if (metadata.surface !== FRONTEND_SURFACE) return null;

  const rawTab = typeof metadata.frontendTab === "string" ? metadata.frontendTab : null;
  if (!isFrontendTabKey(rawTab)) return null;

  const rawKind = typeof metadata.entryKind === "string" ? metadata.entryKind : null;
  const entryKind: FrontendEntryKind =
    rawKind === "concept" || rawKind === "reported-question" || rawKind === "recovery-drill"
      ? rawKind
      : "recovery-drill";

  const rawPriority = typeof metadata.priority === "string" ? metadata.priority : null;
  const priority: FrontendPriority = rawPriority === "mvp" || rawPriority === "stretch" ? rawPriority : "core";

  const sourceRefs = Array.isArray(metadata.sourceRefs)
    ? (metadata.sourceRefs as Array<Record<string, unknown>>)
        .map((source) => {
          const label = typeof source.label === "string" ? source.label : null;
          const url = typeof source.url === "string" ? source.url : null;
          if (!label || !url) return null;
          return { label, url } satisfies FrontendManifestSource;
        })
        .filter((source): source is FrontendManifestSource => Boolean(source))
    : [];

  return {
    surface: FRONTEND_SURFACE,
    frontendTab: rawTab,
    entryKind,
    conceptCluster: typeof metadata.conceptCluster === "string" ? metadata.conceptCluster : "Other",
    roundTag: typeof metadata.roundTag === "string" ? metadata.roundTag : "Unknown",
    priority,
    seedKey: typeof metadata.seedKey === "string" ? metadata.seedKey : "",
    bankId: typeof metadata.bankId === "string" ? metadata.bankId : null,
    sourceRefs,
    difficulty: typeof metadata.difficulty === "string" ? metadata.difficulty : null,
    timebox: typeof metadata.timebox === "string" ? metadata.timebox : null,
    level: typeof metadata.level === "string" ? metadata.level : null,
    whyItMatters: typeof metadata.whyItMatters === "string" ? metadata.whyItMatters : null,
    expectedShape: typeof metadata.expectedShape === "string" ? metadata.expectedShape : null,
    studyGuideMarkdown: typeof metadata.studyGuideMarkdown === "string" ? metadata.studyGuideMarkdown : null,
    reportedContext: typeof metadata.reportedContext === "string" ? metadata.reportedContext : null,
    reportedPrompt: typeof metadata.reportedPrompt === "string" ? metadata.reportedPrompt : null,
    practicePrompt: typeof metadata.practicePrompt === "string" ? metadata.practicePrompt : null,
  };
}

export function toFrontendBankItem(item: PrepItem): FrontendBankItem | null {
  const meta = frontendMeta(item);
  if (!meta) return null;

  const completedAt = frontendCompletedAt(item);
  const status = frontendItemStatus(item);
  const isDue = status === "DUE";
  const isOverdue = isDue && Boolean(item.nextReviewAt) && new Date(item.nextReviewAt as string).getTime() < Date.now();

  return {
    item,
    meta,
    completedAt,
    status,
    isDue,
    isOverdue,
    sourceKind: frontendSourceKind(meta.entryKind),
  };
}

export function difficultyRank(value: string | null | undefined): number {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "easy") return 0;
  if (raw === "medium") return 1;
  if (raw === "hard") return 2;
  return 3;
}

export function priorityRank(value: FrontendPriority): number {
  if (value === "mvp") return 0;
  if (value === "core") return 1;
  return 2;
}

export function bankIdSortValue(bankId: string | null | undefined): number {
  const match = String(bankId ?? "").match(/^(?:[A-Z]+)-(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function groupBankItems(items: FrontendBankItem[]): FrontendBankGroup[] {
  const map = new Map<string, FrontendBankItem[]>();
  for (const item of items) {
    const key = item.item.type === "LEETCODE" ? item.item.pattern ?? item.meta.conceptCluster : item.meta.conceptCluster;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([conceptCluster, grouped]) => ({
    conceptCluster,
    items: grouped.sort((a, b) => {
      if (a.item.type === "LEETCODE" && b.item.type === "LEETCODE") {
        const difficulty = difficultyRank(a.item.difficulty) - difficultyRank(b.item.difficulty);
        if (difficulty !== 0) return difficulty;
      }

      const priority = priorityRank(a.meta.priority) - priorityRank(b.meta.priority);
      if (priority !== 0) return priority;

      const bankId = bankIdSortValue(a.meta.bankId) - bankIdSortValue(b.meta.bankId);
      if (bankId !== 0) return bankId;

      return a.item.title.localeCompare(b.item.title);
    }),
  }));
}

export function startHereForTab(tab: FrontendTabKey) {
  return FRONTEND_BANK_MANIFEST.tabs[tab].startHere.map((block) => ({
    ...block,
    items: block.itemIds.map((bankId) => ({
      bankId,
      title: FRONTEND_BANK_ENTRY_BY_ID.get(bankId)?.title ?? null,
    })),
  }));
}
