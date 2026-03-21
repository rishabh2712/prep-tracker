"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { companySignalsFromItem } from "@/lib/company-signals";
import { inferSystemDesignConcept, inferSystemDesignLevel } from "@/lib/system-design-taxonomy";
import type { GoalDayRecord, GoalItemRecord, GoalProgress, GoalRecord, GoalSessionRecord, PrepItem } from "@/lib/types";
import { formatDate, formatRelative } from "@/lib/ui";

type ModuleKey = "LEETCODE" | "SYSTEMS" | "SETTINGS";
type SystemTab = "CORE" | "GENAI" | "FRONTEND";
type NotesTab = "NOTES" | "RUBRIC";
type PatternSort = "FREQUENCY" | "COMPLETION";
type DrawerOutcome = "AGAIN" | "HARD" | "GOOD" | "EASY";
type FrequencyWindow = "ALL" | "THIRTY_DAYS" | "THREE_MONTHS" | "SIX_MONTHS" | "MORE_THAN_SIX_MONTHS";

type NotesDoc = {
  content: string;
  checksum: string | null;
};

type RubricState = {
  requirementsClarified: boolean;
  estimationDone: boolean;
  apiDesignDone: boolean;
  schemaDrawn: boolean;
  scalingAddressed: boolean;
};

const MODULES: Array<{ key: ModuleKey; label: string; desc: string }> = [
  { key: "LEETCODE", label: "Module A: Algorithms & Data Structures", desc: "Pattern matrix + SRS queue" },
  { key: "SYSTEMS", label: "Module B: Systems & Architecture", desc: "Concept milestones + rubric" },
  { key: "SETTINGS", label: "Settings / Global State", desc: "Goal, company, and sprint controls" },
];

const SYSTEM_TAB_TRACKS: Record<SystemTab, string[]> = {
  CORE: ["backend-core", "distributed-systems"],
  GENAI: ["genai-backend-orchestration"],
  FRONTEND: ["genai-frontend-lld"],
};

const SYSTEM_TAB_LABELS: Record<SystemTab, string> = {
  CORE: "Core Systems",
  GENAI: "Gen AI",
  FRONTEND: "Frontend",
};

const FREQUENCY_WINDOW_OPTIONS: Array<{ value: FrequencyWindow; label: string; shortLabel: string }> = [
  { value: "ALL", label: "All Time", shortLabel: "All" },
  { value: "THIRTY_DAYS", label: "Last 30 Days", shortLabel: "30d" },
  { value: "THREE_MONTHS", label: "Last 3 Months", shortLabel: "3m" },
  { value: "SIX_MONTHS", label: "Last 6 Months", shortLabel: "6m" },
  { value: "MORE_THAN_SIX_MONTHS", label: "More Than 6 Months", shortLabel: ">6m" },
];

const DEFAULT_RUBRIC: RubricState = {
  requirementsClarified: false,
  estimationDone: false,
  apiDesignDone: false,
  schemaDrawn: false,
  scalingAddressed: false,
};

type SystemStatus = "NOT_STARTED" | "DRAFTING_NOTES" | "MOCK_INTERVIEWED" | "CONFIDENT";

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayOffset(startDate: string, now = new Date()): number {
  const startMs = new Date(`${startDate}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(startMs)) return 1;
  const diff = now.getTime() - startMs;
  return Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)) + 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function itemTrack(item: PrepItem): string {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const metaTrack = metadata.sdTrack;
  if (typeof metaTrack === "string" && metaTrack.trim()) return metaTrack.trim();

  const tagTrack = (item.tags ?? []).find((tag) => tag.toLowerCase().startsWith("track:"));
  if (tagTrack) return tagTrack.slice("track:".length).trim();
  return "untracked";
}

function frequencyWindowToMetadataKey(window: FrequencyWindow): string | null {
  if (window === "THIRTY_DAYS") return "thirty-days";
  if (window === "THREE_MONTHS") return "three-months";
  if (window === "SIX_MONTHS") return "six-months";
  if (window === "MORE_THAN_SIX_MONTHS") return "more-than-six-months";
  return null;
}

function isFrequencyWindow(value: string | null): value is FrequencyWindow {
  return FREQUENCY_WINDOW_OPTIONS.some((option) => option.value === value);
}

function frequencyForWindow(item: PrepItem, window: FrequencyWindow): number {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const lww = metadata.leetcodeWizard as Record<string, unknown> | undefined;
  const freqs = lww && typeof lww === "object" ? (lww.frequencies as Record<string, unknown> | undefined) : undefined;
  if (!freqs || typeof freqs !== "object") return 0;

  if (window === "ALL") {
    const allScore = Number(freqs.all ?? freqs["three-months"] ?? freqs["six-months"] ?? freqs["more-than-six-months"] ?? 0);
    if (Number.isFinite(allScore)) return allScore;
    return 0;
  }

  const key = frequencyWindowToMetadataKey(window);
  if (!key) return 0;
  const score = Number(freqs[key] ?? 0);
  if (Number.isFinite(score)) return score;
  return 0;
}

function itemFrequency(item: PrepItem, company: string, window: FrequencyWindow): number {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const companyFrequency = Array.isArray(metadata.companyFrequency)
    ? (metadata.companyFrequency as Array<Record<string, unknown>>)
    : [];

  if (window !== "ALL") {
    return frequencyForWindow(item, window);
  }

  if (window === "ALL" && company !== "ALL") {
    const match = companyFrequency.find((entry) => String(entry.name ?? "").toLowerCase() === company.toLowerCase());
    if (match) {
      const score = Number(match.score ?? 0);
      if (Number.isFinite(score)) return score;
    }
  }

  const windowScore = frequencyForWindow(item, window);
  if (windowScore > 0) return windowScore;

  const topCompany = companyFrequency[0];
  if (topCompany) {
    const score = Number(topCompany.score ?? 0);
    if (Number.isFinite(score)) return score;
  }

  return 0;
}

function difficultyTone(difficulty: string | null): string {
  const raw = (difficulty ?? "").toLowerCase();
  if (raw === "easy") return "text-emerald-400";
  if (raw === "medium") return "text-amber-400";
  if (raw === "hard") return "text-rose-500";
  return "text-zinc-400";
}

function isLeetcodeSolved(item: PrepItem): boolean {
  return item.leetcodeOutcome === "SOLVED";
}

function srsRowTone(item: PrepItem): string {
  if (!item.lastSolvedAt) return "border-zinc-800 bg-zinc-900/50";
  if (item.shouldReviewAgain && item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now()) {
    return "border-rose-500/60 bg-rose-950/30";
  }
  if (!item.shouldReviewAgain || item.reviewIntervalDays >= 21) {
    return "border-emerald-500/40 bg-emerald-950/20";
  }
  return "border-blue-400/40 bg-blue-950/20";
}

function lastExecutionNotes(item: PrepItem): string {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const raw = metadata.lastExecutionNotes;
  return typeof raw === "string" ? raw : "";
}

function parseRubric(item: PrepItem): RubricState {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const rubric = metadata.sdRubric;
  if (!rubric || typeof rubric !== "object" || Array.isArray(rubric)) return DEFAULT_RUBRIC;

  const data = rubric as Record<string, unknown>;
  return {
    requirementsClarified: Boolean(data.requirementsClarified),
    estimationDone: Boolean(data.estimationDone),
    apiDesignDone: Boolean(data.apiDesignDone),
    schemaDrawn: Boolean(data.schemaDrawn),
    scalingAddressed: Boolean(data.scalingAddressed),
  };
}

function systemStatus(item: PrepItem): SystemStatus {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const raw = String(metadata.sdStatus ?? "NOT_STARTED").toUpperCase();
  if (raw === "DRAFTING_NOTES" || raw === "MOCK_INTERVIEWED" || raw === "CONFIDENT") return raw;
  return "NOT_STARTED";
}

function paceClass(pace: GoalProgress["progress"]["paceStatus"]): string {
  if (pace === "ON_TRACK") return "text-emerald-300 border-emerald-500/40";
  if (pace === "AT_RISK") return "text-rose-300 border-rose-500/40";
  return "text-zinc-300 border-zinc-600";
}

function radarPoints(values: number[], radius: number, cx: number, cy: number): string {
  if (values.length === 0) return "";
  const points = values.map((value, idx) => {
    const angle = (Math.PI * 2 * idx) / values.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x},${y}`;
  });
  return points.join(" ");
}

function timelineHeatTone(solvedCount: number, isCurrentDay: boolean): string {
  if (solvedCount >= 5) return "bg-blue-300 text-zinc-950";
  if (solvedCount >= 3) return "bg-blue-500 text-zinc-100";
  if (solvedCount >= 2) return "bg-blue-700 text-zinc-100";
  if (solvedCount >= 1) return "bg-blue-900 text-blue-100";
  return isCurrentDay ? "bg-zinc-600 text-zinc-100 ring-1 ring-blue-400/60" : "bg-zinc-800 text-zinc-500";
}

export function PrepSprint60Client() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  const [module, setModule] = useState<ModuleKey>("LEETCODE");
  const [systemTab, setSystemTab] = useState<SystemTab>("CORE");
  const [notesTab, setNotesTab] = useState<NotesTab>("NOTES");

  const [companyFilter, setCompanyFilter] = useState<string>("ALL");
  const [frequencyWindow, setFrequencyWindow] = useState<FrequencyWindow>("ALL");
  const [patternSort, setPatternSort] = useState<PatternSort>("FREQUENCY");
  const [expandedPatterns, setExpandedPatterns] = useState<Record<string, boolean>>({});

  const [goalItems, setGoalItems] = useState<GoalItemRecord[]>([]);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
  const [goalDays, setGoalDays] = useState<GoalDayRecord[]>([]);
  const [goalSessions, setGoalSessions] = useState<GoalSessionRecord[]>([]);
  const [leetcodeBank, setLeetcodeBank] = useState<PrepItem[]>([]);

  const [showPlanner, setShowPlanner] = useState(false);
  const [plannerBusy, setPlannerBusy] = useState(false);

  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [timeComplexity, setTimeComplexity] = useState("O(n)");
  const [spaceComplexity, setSpaceComplexity] = useState("O(1)");
  const [executionNotes, setExecutionNotes] = useState("");
  const [minutesSpent, setMinutesSpent] = useState("20");

  const [selectedSystemItemId, setSelectedSystemItemId] = useState<string | null>(null);
  const [notesDoc, setNotesDoc] = useState<NotesDoc>({ content: "", checksum: null });
  const [notesBusy, setNotesBusy] = useState(false);

  const activeGoal = useMemo(() => goals.find((goal) => goal.id === activeGoalId) ?? null, [goals, activeGoalId]);

  const leetcodeGoalItems = useMemo(
    () => goalItems.filter((entry) => entry.moduleKind === "LEETCODE").map((entry) => entry.item),
    [goalItems]
  );

  const leetcodeUniverse = useMemo(
    () => (leetcodeBank.length > 0 ? leetcodeBank : leetcodeGoalItems),
    [leetcodeBank, leetcodeGoalItems]
  );

  const systemGoalItems = useMemo(
    () => goalItems.filter((entry) => entry.moduleKind === "SYSTEM_DESIGN").map((entry) => entry.item),
    [goalItems]
  );

  const drawerItem = useMemo(
    () => leetcodeUniverse.find((item) => item.id === drawerItemId) ?? null,
    [leetcodeUniverse, drawerItemId]
  );

  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of leetcodeUniverse) {
      for (const signal of companySignalsFromItem(item)) {
        set.add(signal.name);
      }
    }
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [leetcodeUniverse]);

  useEffect(() => {
    const fromUrlRaw = searchParams.get("company");
    const nextCompany =
      fromUrlRaw && fromUrlRaw.trim()
        ? (companyOptions.find((option) => option.toLowerCase() === fromUrlRaw.toLowerCase()) ?? "ALL")
        : "ALL";
    const fromWindowRaw = searchParams.get("window");
    const nextWindow = isFrequencyWindow(fromWindowRaw) ? fromWindowRaw : "ALL";

    setCompanyFilter((prev) => (prev === nextCompany ? prev : nextCompany));
    setFrequencyWindow((prev) => (prev === nextWindow ? prev : nextWindow));
  }, [searchParams, companyOptions]);

  function applyLeetcodeFilters(nextCompany: string, nextWindow: FrequencyWindow) {
    setCompanyFilter(nextCompany);
    setFrequencyWindow(nextWindow);
    const params = new URLSearchParams(searchParams.toString());
    if (nextCompany === "ALL") {
      params.delete("company");
    } else {
      params.set("company", nextCompany);
    }
    if (nextWindow === "ALL") {
      params.delete("window");
    } else {
      params.set("window", nextWindow);
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  const frequencyWindowMeta = useMemo(
    () => FREQUENCY_WINDOW_OPTIONS.find((option) => option.value === frequencyWindow) ?? FREQUENCY_WINDOW_OPTIONS[0],
    [frequencyWindow]
  );

  const filteredLeetcode = useMemo(() => {
    const byCompany =
      companyFilter === "ALL"
        ? leetcodeUniverse
        : leetcodeUniverse.filter((item) => companySignalsFromItem(item).some((signal) => signal.name === companyFilter));

    const byWindow =
      frequencyWindow === "ALL" ? byCompany : byCompany.filter((item) => frequencyForWindow(item, frequencyWindow) > 0);

    return [...byWindow].sort((a, b) => {
      const af = itemFrequency(a, companyFilter, frequencyWindow);
      const bf = itemFrequency(b, companyFilter, frequencyWindow);
      if (bf !== af) return bf - af;
      return a.title.localeCompare(b.title);
    });
  }, [leetcodeUniverse, companyFilter, frequencyWindow]);

  const patternGroups = useMemo(() => {
    const map = new Map<string, PrepItem[]>();
    for (const item of filteredLeetcode) {
      const pattern = item.pattern?.trim() || "Uncategorized";
      const group = map.get(pattern) ?? [];
      group.push(item);
      map.set(pattern, group);
    }

    const rows = Array.from(map.entries()).map(([pattern, items]) => {
      const solved = items.filter((item) => item.leetcodeOutcome === "SOLVED").length;
      const completion = items.length > 0 ? Math.round((solved / items.length) * 100) : 0;
      const avgFrequency =
        items.length > 0
          ? Math.round(items.reduce((sum, item) => sum + itemFrequency(item, companyFilter, frequencyWindow), 0) / items.length)
          : 0;

      return { pattern, items, solved, completion, avgFrequency };
    });

    return rows.sort((a, b) => {
      if (patternSort === "FREQUENCY") {
        if (b.avgFrequency !== a.avgFrequency) return b.avgFrequency - a.avgFrequency;
      } else {
        if (b.completion !== a.completion) return b.completion - a.completion;
      }
      return a.pattern.localeCompare(b.pattern);
    });
  }, [filteredLeetcode, companyFilter, frequencyWindow, patternSort]);

  const dueToday = useMemo(() => {
    return leetcodeUniverse
      .filter(
        (item) =>
          isLeetcodeSolved(item) &&
          item.shouldReviewAgain &&
          item.nextReviewAt &&
          new Date(item.nextReviewAt).getTime() <= Date.now()
      )
      .sort((a, b) => {
        const at = new Date(a.nextReviewAt ?? "").getTime();
        const bt = new Date(b.nextReviewAt ?? "").getTime();
        return at - bt;
      });
  }, [leetcodeUniverse]);

  const leetcodeSolvedStats = useMemo(() => {
    const total = leetcodeUniverse.length;
    const solved = leetcodeUniverse.filter((item) => item.leetcodeOutcome === "SOLVED").length;
    const inViewTotal = filteredLeetcode.length;
    const inViewSolved = filteredLeetcode.filter((item) => item.leetcodeOutcome === "SOLVED").length;
    return {
      total,
      solved,
      pct: total > 0 ? Math.round((solved / total) * 100) : 0,
      inViewTotal,
      inViewSolved,
      inViewPct: inViewTotal > 0 ? Math.round((inViewSolved / inViewTotal) * 100) : 0,
    };
  }, [leetcodeUniverse, filteredLeetcode]);

  const forecast = useMemo(() => {
    const out: Array<{ label: string; count: number }> = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() + i);
      const key = toDayKey(day);
      const count = leetcodeUniverse.filter((item) => {
        if (!isLeetcodeSolved(item) || !item.shouldReviewAgain || !item.nextReviewAt) return false;
        return item.nextReviewAt.slice(0, 10) === key;
      }).length;
      out.push({ label: key.slice(5), count });
    }
    return out;
  }, [leetcodeUniverse]);

  const radar = useMemo(() => {
    const top = patternGroups.slice(0, 6);
    return {
      labels: top.map((entry) => entry.pattern),
      values: top.map((entry) => entry.completion),
    };
  }, [patternGroups]);

  const scopedSystemItems = useMemo(() => {
    const tracks = SYSTEM_TAB_TRACKS[systemTab];
    return systemGoalItems.filter((item) => tracks.includes(itemTrack(item)));
  }, [systemGoalItems, systemTab]);

  const groupedSystemConcepts = useMemo(() => {
    const groups = new Map<string, PrepItem[]>();
    for (const item of scopedSystemItems) {
      const concept = inferSystemDesignConcept(item);
      const arr = groups.get(concept) ?? [];
      arr.push(item);
      groups.set(concept, arr);
    }

    return Array.from(groups.entries())
      .map(([concept, items]) => ({ concept, items: items.sort((a, b) => a.title.localeCompare(b.title)) }))
      .sort((a, b) => a.concept.localeCompare(b.concept));
  }, [scopedSystemItems]);

  const selectedSystemItem = useMemo(
    () => scopedSystemItems.find((item) => item.id === selectedSystemItemId) ?? null,
    [scopedSystemItems, selectedSystemItemId]
  );

  const dayNumber = useMemo(() => {
    if (!activeGoal) return 1;
    return clamp(dayOffset(activeGoal.startDate), 1, 60);
  }, [activeGoal]);

  const timelineCells = useMemo(() => {
    if (!activeGoal) return [];
    const start = new Date(`${activeGoal.startDate}T00:00:00.000Z`);
    if (!Number.isFinite(start.getTime())) return [];

    const solvedByDate = new Map<string, Set<string>>();
    for (const session of goalSessions) {
      if (session.moduleKind !== "LEETCODE" || session.action !== "LEETCODE_SOLVED") continue;
      const key = session.sessionAt.slice(0, 10);
      const itemSet = solvedByDate.get(key) ?? new Set<string>();
      itemSet.add(session.itemId);
      solvedByDate.set(key, itemSet);
    }

    for (const day of goalDays) {
      const itemSet = solvedByDate.get(day.date) ?? new Set<string>();
      for (const entry of day.entries ?? []) {
        if (entry.entryType !== "LEETCODE_SOLVED") continue;
        itemSet.add(entry.itemId);
      }
      solvedByDate.set(day.date, itemSet);
    }

    const cells: Array<{ day: number; date: string; solvedCount: number; isCurrentDay: boolean }> = [];
    const today = toDayKey(new Date());
    for (let idx = 0; idx < 60; idx += 1) {
      const current = new Date(start);
      current.setUTCDate(start.getUTCDate() + idx);
      const date = current.toISOString().slice(0, 10);
      const solvedCount = solvedByDate.get(date)?.size ?? 0;
      cells.push({
        day: idx + 1,
        date,
        solvedCount,
        isCurrentDay: date === today,
      });
    }
    return cells;
  }, [activeGoal, goalSessions, goalDays]);

  const timelineSolvedTotal = useMemo(
    () => timelineCells.reduce((sum, cell) => sum + cell.solvedCount, 0),
    [timelineCells]
  );
  const timelineSolvedToday = useMemo(
    () => timelineCells.find((cell) => cell.day === dayNumber)?.solvedCount ?? 0,
    [timelineCells, dayNumber]
  );

  const todayGoalDay = useMemo(() => {
    if (goalDays.length === 0) return null;
    const todayKey = toDayKey(new Date());
    const exact = goalDays.find((day) => day.date === todayKey);
    if (exact) return exact;

    const nearest = [...goalDays].sort((a, b) => {
      const ad = Math.abs(new Date(`${a.date}T00:00:00.000Z`).getTime() - Date.now());
      const bd = Math.abs(new Date(`${b.date}T00:00:00.000Z`).getTime() - Date.now());
      return ad - bd;
    });
    return nearest[0] ?? null;
  }, [goalDays]);

  const todayEntries = todayGoalDay?.entries ?? [];
  const todayLcEntries = todayEntries.filter((entry) => entry.entryType === "LEETCODE_SOLVED");
  const todaySdEntries = todayEntries.filter((entry) => entry.entryType === "SYSTEM_DESIGN_READ");

  const unplannedSystemItems = useMemo(() => {
    const selectedIds = new Set(todaySdEntries.map((entry) => entry.itemId));
    return scopedSystemItems.filter((item) => !selectedIds.has(item.id));
  }, [scopedSystemItems, todaySdEntries]);

  const [plannerSystemPick, setPlannerSystemPick] = useState<string>("");

  async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const json = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) {
      throw new Error(json.error ?? `Request failed: ${response.status}`);
    }
    return json;
  }

  async function loadGoalRuntime(goalId: string) {
    const [itemsRes, progressRes, daysRes, sessionsRes] = await Promise.all([
      fetchJson<{ items: GoalItemRecord[] }>(`/api/goals/${goalId}/items`),
      fetchJson<{ progress: GoalProgress }>(`/api/goals/${goalId}/progress`),
      fetchJson<{ days: GoalDayRecord[] }>(`/api/goals/${goalId}/days`),
      fetchJson<{ sessions: GoalSessionRecord[] }>(`/api/goals/${goalId}/sessions?limit=2000`),
    ]);

    setGoalItems(itemsRes.items ?? []);
    setGoalProgress(progressRes.progress ?? null);
    setGoalDays(daysRes.days ?? []);
    setGoalSessions(sessionsRes.sessions ?? []);
  }

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [goalsRes, lcBankRes] = await Promise.all([
        fetchJson<{ goals: GoalRecord[] }>("/api/goals"),
        fetchJson<{ items: PrepItem[] }>("/api/bank?kind=LEETCODE"),
      ]);

      const allGoals = goalsRes.goals ?? [];
      setGoals(allGoals);
      setLeetcodeBank(lcBankRes.items ?? []);

      const goalItemCounts = new Map<string, number>();
      await Promise.all(
        allGoals.map(async (goal) => {
          try {
            const itemsRes = await fetchJson<{ items: GoalItemRecord[] }>(`/api/goals/${goal.id}/items`);
            goalItemCounts.set(goal.id, itemsRes.items?.length ?? 0);
          } catch {
            goalItemCounts.set(goal.id, 0);
          }
        })
      );

      const hasItems = (goal: GoalRecord) => (goalItemCounts.get(goal.id) ?? 0) > 0;
      const isUber = (goal: GoalRecord) => goal.name.toLowerCase().includes("uber");
      const pickMaxByItems = (predicate: (goal: GoalRecord) => boolean): GoalRecord | null => {
        const candidates = allGoals.filter(predicate);
        if (candidates.length === 0) return null;
        return candidates.reduce((best, current) => {
          const bestCount = goalItemCounts.get(best.id) ?? 0;
          const currentCount = goalItemCounts.get(current.id) ?? 0;
          if (currentCount !== bestCount) return currentCount > bestCount ? current : best;
          return new Date(current.updatedAt).getTime() > new Date(best.updatedAt).getTime() ? current : best;
        });
      };

      const preferredGoal =
        pickMaxByItems((goal) => isUber(goal) && hasItems(goal)) ??
        pickMaxByItems((goal) => goal.status === "ACTIVE" && hasItems(goal)) ??
        pickMaxByItems((goal) => hasItems(goal)) ??
        allGoals.find((goal) => isUber(goal)) ??
        allGoals.find((goal) => goal.status === "ACTIVE") ??
        allGoals[0] ??
        null;

      const nextGoalId = activeGoalId && allGoals.some((goal) => goal.id === activeGoalId) ? activeGoalId : preferredGoal?.id ?? null;
      setActiveGoalId(nextGoalId);

      if (nextGoalId) {
        await loadGoalRuntime(nextGoalId);
      } else {
        setGoalItems([]);
        setGoalProgress(null);
        setGoalDays([]);
        setGoalSessions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load PrepSprint data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scopedSystemItems.length === 0) {
      setSelectedSystemItemId(null);
      return;
    }

    if (!selectedSystemItemId || !scopedSystemItems.some((item) => item.id === selectedSystemItemId)) {
      setSelectedSystemItemId(scopedSystemItems[0].id);
    }
  }, [scopedSystemItems, selectedSystemItemId]);

  useEffect(() => {
    if (!selectedSystemItem) return;
    const item = selectedSystemItem;

    let cancelled = false;

    async function loadDoc() {
      try {
        const res = await fetch(`/api/system-design/${item.id}/markdown`, { cache: "no-store" });
        if (!res.ok) {
          setNotesDoc({ content: item.notesMarkdown ?? "", checksum: null });
          return;
        }
        const json = (await res.json()) as { doc?: { content: string; checksum: string } };
        if (cancelled) return;
        setNotesDoc({ content: json.doc?.content ?? "", checksum: json.doc?.checksum ?? null });
      } catch {
        if (!cancelled) {
          setNotesDoc({ content: item.notesMarkdown ?? "", checksum: null });
        }
      }
    }

    void loadDoc();
    return () => {
      cancelled = true;
    };
  }, [selectedSystemItem]);

  useEffect(() => {
    if (!plannerSystemPick && unplannedSystemItems.length > 0) {
      setPlannerSystemPick(unplannedSystemItems[0].id);
    }
  }, [plannerSystemPick, unplannedSystemItems]);

  async function refreshActiveGoal() {
    if (!activeGoalId) return;
    await loadGoalRuntime(activeGoalId);
  }

  function syncItemInState(updatedItem: PrepItem) {
    setLeetcodeBank((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    setGoalItems((prev) =>
      prev.map((entry) => (entry.item.id === updatedItem.id ? { ...entry, item: updatedItem } : entry))
    );
  }

  function openLeetcodeDrawer(item: PrepItem) {
    setDrawerItemId(item.id);
    setExecutionNotes(lastExecutionNotes(item));
    setMinutesSpent(String(item.timeSpentMinutes ?? 20));
  }

  async function patchItem(itemId: string, patch: Partial<PrepItem>) {
    const response = await fetchJson<{ item: PrepItem }>(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    syncItemInState(response.item);
    return response.item;
  }

  async function submitSrs(outcome: DrawerOutcome) {
    if (!drawerItem) return;

    setDrawerBusy(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const mins = Math.max(0, Number(minutesSpent) || 0);
      const nextAttemptCount = drawerItem.leetcodeOutcome === "SOLVED" ? drawerItem.attemptCount ?? 0 : (drawerItem.attemptCount ?? 0) + 1;

      const summary = [
        `### Latest attempt (${new Date(now).toLocaleString("en-IN")})`,
        `- Time Complexity: ${timeComplexity || "-"}`,
        `- Space Complexity: ${spaceComplexity || "-"}`,
        `- Minutes Spent: ${mins}`,
        `- Outcome: ${outcome}`,
        executionNotes ? `- Notes: ${executionNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const mergedMetadata: Record<string, unknown> = {
        ...((drawerItem.metadata ?? {}) as Record<string, unknown>),
        lastExecutionNotes: executionNotes.trim(),
        lastExecutionOutcome: outcome,
        lastExecutionAt: now,
      };

      await patchItem(drawerItem.id, {
        leetcodeOutcome: "SOLVED",
        lastSolvedAt: now,
        lastAttemptedAt: now,
        attemptCount: nextAttemptCount,
        timeSpentMinutes: (drawerItem.timeSpentMinutes ?? 0) + mins,
        solutionSummaryMarkdown: summary,
        metadata: mergedMetadata,
      });

      const reviewResult = await fetchJson<{ item: PrepItem }>(`/api/items/${drawerItem.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, goalId: activeGoalId ?? undefined, notesMarkdown: executionNotes.trim() }),
      });
      syncItemInState(reviewResult.item);

      if (activeGoalId) {
        await fetchJson(`/api/goals/${activeGoalId}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleKind: "LEETCODE",
            itemId: drawerItem.id,
            action: "LEETCODE_SOLVED",
            minutesSpent: mins,
            notesMarkdown: executionNotes.trim(),
          }),
        });
      }

      await refreshActiveGoal();
      setExecutionNotes(lastExecutionNotes(reviewResult.item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit review");
    } finally {
      setDrawerBusy(false);
    }
  }

  async function resetLeetcodeProgress() {
    if (!drawerItem) return;
    setDrawerBusy(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const mergedMetadata: Record<string, unknown> = {
        ...((drawerItem.metadata ?? {}) as Record<string, unknown>),
        lastExecutionOutcome: "RESET",
        lastExecutionAt: now,
      };

      const updated = await patchItem(drawerItem.id, {
        leetcodeOutcome: "TODO",
        lastSolvedAt: null,
        shouldReviewAgain: false,
        reviewIntervalDays: 0,
        nextReviewAt: null,
        solutionSummaryMarkdown: null,
        metadata: mergedMetadata,
      });

      if (activeGoalId) {
        await fetchJson(`/api/goals/${activeGoalId}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleKind: "LEETCODE",
            itemId: drawerItem.id,
            action: "REVIEW",
            minutesSpent: 0,
            notesMarkdown: "Reset solved state",
          }),
        });
      }

      await refreshActiveGoal();
      setExecutionNotes(lastExecutionNotes(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset solved state");
    } finally {
      setDrawerBusy(false);
    }
  }

  async function setGoalDayEntry(itemId: string, entryType: "LEETCODE_SOLVED" | "SYSTEM_DESIGN_READ") {
    if (!todayGoalDay) {
      setError("No active day found for this goal range");
      return;
    }

    setPlannerBusy(true);
    setError(null);

    try {
      await fetchJson(`/api/goal-days/${todayGoalDay.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, entryType }),
      });
      await refreshActiveGoal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update planner");
    } finally {
      setPlannerBusy(false);
    }
  }

  async function removeGoalDayEntry(entryId: string) {
    if (!todayGoalDay) return;
    setPlannerBusy(true);
    setError(null);

    try {
      await fetchJson(`/api/goal-days/${todayGoalDay.id}/entries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });
      await refreshActiveGoal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove planner entry");
    } finally {
      setPlannerBusy(false);
    }
  }

  async function saveSystemNotes() {
    if (!selectedSystemItem) return;
    setNotesBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/system-design/${selectedSystemItem.id}/markdown`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: notesDoc.content,
          expectedChecksum: notesDoc.checksum ?? undefined,
        }),
      });

      const json = (await response.json().catch(() => ({}))) as { doc?: { checksum: string }; error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to save notes");
      }

      setNotesDoc((prev) => ({ ...prev, checksum: json.doc?.checksum ?? prev.checksum }));
      await refreshActiveGoal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save notes");
    } finally {
      setNotesBusy(false);
    }
  }

  async function updateSystemMetadata(item: PrepItem, patch: Record<string, unknown>) {
    const existing = (item.metadata ?? {}) as Record<string, unknown>;
    await patchItem(item.id, {
      metadata: {
        ...existing,
        ...patch,
      },
    });
    await refreshActiveGoal();
  }

  async function onRubricToggle(key: keyof RubricState, checked: boolean) {
    if (!selectedSystemItem) return;
    const rubric = parseRubric(selectedSystemItem);
    rubric[key] = checked;

    try {
      await updateSystemMetadata(selectedSystemItem, { sdRubric: rubric });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update rubric");
    }
  }

  async function onStatusChange(status: SystemStatus) {
    if (!selectedSystemItem) return;
    try {
      await updateSystemMetadata(selectedSystemItem, { sdStatus: status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status");
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-300">
        Loading PrepSprint 60...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="grid h-full grid-cols-[18rem_1fr]">
        <aside className="border-r border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-blue-300">PrepSprint 60</p>
            <h1 className="mt-1 text-lg font-semibold text-zinc-100">Interview Preparation Workspace</h1>
          </div>

          <div className="mb-5 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-300">
              <span>The 60-Day Timeline</span>
              <span>Day {dayNumber} / 60</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full bg-blue-500" style={{ width: `${(dayNumber / 60) * 100}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Today solved: {timelineSolvedToday}</span>
              <span>Sprint solved: {timelineSolvedTotal}</span>
            </div>
            <div className="mt-3 grid grid-cols-10 gap-1">
              {timelineCells.map((cell) => (
                <div
                  key={cell.day}
                  className={`flex h-5 items-center justify-center rounded text-[10px] font-semibold ${timelineHeatTone(cell.solvedCount, cell.isCurrentDay)}`}
                  title={`Day ${cell.day} • ${cell.date} • ${cell.solvedCount} solved`}
                >
                  {cell.solvedCount > 0 ? cell.solvedCount : ""}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-zinc-500">Heat: 1, 2, 3-4, 5+ solved</p>
          </div>

          <nav className="space-y-2">
            {MODULES.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setModule(entry.key)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  module === entry.key
                    ? entry.key === "LEETCODE"
                      ? "border-blue-500/70 bg-blue-950/40"
                      : entry.key === "SYSTEMS"
                        ? "border-violet-500/70 bg-violet-950/40"
                        : "border-zinc-500 bg-zinc-800"
                    : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
                }`}
              >
                <p className="text-xs font-semibold text-zinc-100">{entry.label}</p>
                <p className="text-[11px] text-zinc-400">{entry.desc}</p>
              </button>
            ))}
          </nav>

          <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-400">
            <p className="font-semibold text-zinc-200">Active Goal</p>
            <p className="mt-1 truncate">{activeGoal?.name ?? "No goal selected"}</p>
            <p className="mt-1">{activeGoal ? `${activeGoal.startDate} → ${activeGoal.endDate}` : "Create goal in Settings"}</p>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col">
          <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-5 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Day {dayNumber} of 60</p>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="text-lg font-semibold text-zinc-100">
                  {module === "LEETCODE" ? "LeetCode Engine" : module === "SYSTEMS" ? "Systems & Architecture" : "Global Settings"}
                </h2>
                {goalProgress && (
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${paceClass(goalProgress.progress.paceStatus)}`}>
                    {goalProgress.progress.paceStatus.replaceAll("_", " ")}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPlanner(true)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-500"
            >
              Calendar / Daily Planner
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {module === "LEETCODE" && (
              <section className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <article className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Total Problems</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-100">{leetcodeSolvedStats.inViewTotal}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {companyFilter === "ALL" ? "All companies" : `${companyFilter} filter`} • {leetcodeSolvedStats.total} total in bank
                    </p>
                  </article>
                  <article className="rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-300">Solved</p>
                    <p className="mt-1 text-xl font-semibold text-emerald-200">
                      {leetcodeSolvedStats.inViewSolved} ({leetcodeSolvedStats.inViewPct}%)
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-200/70">Within current filter</p>
                  </article>
                  <article className="rounded-lg border border-blue-700/40 bg-blue-950/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-blue-300">Global Solved</p>
                    <p className="mt-1 text-xl font-semibold text-blue-200">
                      {leetcodeSolvedStats.solved}/{leetcodeSolvedStats.total} ({leetcodeSolvedStats.pct}%)
                    </p>
                  </article>
                </div>

                <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
                  <div className="rounded-xl border border-blue-700/40 bg-blue-950/20 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-blue-200">Pattern Matrix</h3>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <select
                          value={companyFilter}
                          onChange={(event) => applyLeetcodeFilters(event.target.value, frequencyWindow)}
                          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                        >
                          {companyOptions.map((option) => (
                            <option key={option} value={option}>
                              {option === "ALL" ? "Target Company: All" : option}
                            </option>
                          ))}
                        </select>
                        <select
                          value={frequencyWindow}
                          onChange={(event) => applyLeetcodeFilters(companyFilter, event.target.value as FrequencyWindow)}
                          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                        >
                          {FREQUENCY_WINDOW_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              Window: {option.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => setPatternSort((prev) => (prev === "FREQUENCY" ? "COMPLETION" : "FREQUENCY"))}
                          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                        >
                          {patternSort === "FREQUENCY" ? "Sort: Pattern Frequency" : "Sort: Completion %"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {patternGroups.map((group) => {
                        const expanded = expandedPatterns[group.pattern] ?? false;
                        return (
                          <article key={group.pattern} className="rounded-lg border border-zinc-800 bg-zinc-900/70">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPatterns((prev) => ({
                                  ...prev,
                                  [group.pattern]: !expanded,
                                }))
                              }
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-mono text-sm text-zinc-100">{group.pattern}</p>
                                <p className="text-xs text-zinc-400">
                                  🔥 {group.avgFrequency}% {frequencyWindowMeta.shortLabel} yield{" "}
                                  {companyFilter !== "ALL" ? `for ${companyFilter}` : "(global proxy)"}
                                </p>
                              </div>
                              <div className="w-44">
                                <div className="mb-1 flex justify-between text-[11px] text-zinc-300">
                                  <span>{group.solved}/{group.items.length} solved</span>
                                  <span>{group.completion}%</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-700">
                                  <div className="h-full bg-blue-500" style={{ width: `${group.completion}%` }} />
                                </div>
                              </div>
                            </button>

                            <div
                              className={`border-t border-zinc-800 transition-[max-height,opacity] duration-300 ${
                                expanded ? "max-h-[9999px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
                              }`}
                            >
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-zinc-900 text-zinc-400">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium">ID</th>
                                      <th className="px-3 py-2 text-left font-medium">Title</th>
                                      <th className="px-3 py-2 text-left font-medium">Difficulty</th>
                                      <th className="px-3 py-2 text-left font-medium">
                                        Frequency ({frequencyWindowMeta.shortLabel})
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium">Next SRS Review</th>
                                      <th className="px-3 py-2 text-left font-medium">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.items.map((item) => {
                                      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
                                      const rawId =
                                        metadata.leetcodeWizard && typeof metadata.leetcodeWizard === "object"
                                          ? (metadata.leetcodeWizard as Record<string, unknown>).externalId
                                          : null;
                                      const idValue =
                                        typeof rawId === "number" || typeof rawId === "string" ? String(rawId) : null;

                                      return (
                                        <tr key={item.id} className={`border-t border-zinc-800 ${srsRowTone(item)}`}>
                                          <td className="px-3 py-2 font-mono text-zinc-300">{idValue ?? item.problemSlug ?? "-"}</td>
                                          <td className="px-3 py-2 font-medium text-zinc-100">
                                            <div className="flex items-center gap-2">
                                              <span>{item.title}</span>
                                              {isLeetcodeSolved(item) && (
                                                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                                                  Done
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className={`px-3 py-2 font-semibold ${difficultyTone(item.difficulty)}`}>
                                            {item.difficulty ?? "-"}
                                          </td>
                                          <td className="px-3 py-2 text-zinc-300">
                                            {itemFrequency(item, companyFilter, frequencyWindow)}
                                          </td>
                                          <td className="px-3 py-2 text-zinc-300">
                                            {isLeetcodeSolved(item) && item.nextReviewAt
                                              ? `${formatDate(item.nextReviewAt)} (${formatRelative(item.nextReviewAt)})`
                                              : "Not scheduled"}
                                          </td>
                                          <td className="px-3 py-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                openLeetcodeDrawer(item);
                                              }}
                                              className="rounded border border-blue-600/60 bg-blue-950/40 px-2 py-1 font-semibold text-blue-200 hover:bg-blue-900/60"
                                            >
                                              {isLeetcodeSolved(item) ? "Review" : "Open"}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-rose-700/40 bg-rose-950/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200">Reviews Due Today ({dueToday.length})</p>
                      <ul className="mt-2 space-y-2 text-xs">
                        {dueToday.slice(0, 8).map((item) => (
                          <li key={item.id} className="rounded border border-zinc-800 bg-zinc-900/80 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-zinc-100">{item.title}</p>
                                <p className="text-[11px] text-zinc-400">{item.pattern ?? "Uncategorized"}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => openLeetcodeDrawer(item)}
                                className="rounded border border-rose-500/60 px-2 py-1 text-[11px] font-semibold text-rose-200"
                              >
                                Review
                              </button>
                            </div>
                          </li>
                        ))}
                        {dueToday.length === 0 && <li className="text-zinc-400">No due reviews. Add new pattern questions.</li>}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">Spaced Repetition Forecast (7d)</p>
                      <div className="mt-3 grid grid-cols-7 gap-2">
                        {forecast.map((entry) => {
                          const maxCount = Math.max(1, ...forecast.map((item) => item.count));
                          return (
                            <div key={entry.label} className="text-center">
                              <div className="mx-auto h-20 w-4 rounded bg-zinc-800">
                                <div
                                  className="mt-auto w-full rounded bg-blue-500"
                                  style={{ height: `${(entry.count / maxCount) * 100}%` }}
                                />
                              </div>
                              <p className="mt-1 text-[10px] text-zinc-400">{entry.label}</p>
                              <p className="text-[11px] text-zinc-200">{entry.count}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">Pattern Proficiency Radar</p>
                      {radar.labels.length === 0 ? (
                        <p className="mt-2 text-xs text-zinc-400">No pattern data yet.</p>
                      ) : (
                        <div className="mt-2 flex items-start gap-3">
                          <svg viewBox="0 0 220 220" className="h-44 w-44" role="img" aria-label="Pattern proficiency radar">
                            <circle cx="110" cy="110" r="84" fill="none" stroke="#3f3f46" strokeWidth="1" />
                            <circle cx="110" cy="110" r="56" fill="none" stroke="#3f3f46" strokeWidth="1" />
                            <circle cx="110" cy="110" r="28" fill="none" stroke="#3f3f46" strokeWidth="1" />
                            <polygon
                              points={radarPoints(radar.values, 84, 110, 110)}
                              fill="rgba(59,130,246,0.25)"
                              stroke="#60a5fa"
                              strokeWidth="2"
                            />
                          </svg>
                          <ul className="space-y-1 text-[11px] text-zinc-300">
                            {radar.labels.map((label, idx) => (
                              <li key={label} className="flex items-center justify-between gap-3">
                                <span className="max-w-[12rem] truncate">{label}</span>
                                <span className="font-mono text-blue-300">{radar.values[idx]}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {module === "SYSTEMS" && (
              <section className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(["CORE", "GENAI", "FRONTEND"] as SystemTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSystemTab(tab)}
                      className={`rounded border px-3 py-1.5 text-xs font-semibold transition ${
                        systemTab === tab
                          ? "border-violet-500 bg-violet-900/40 text-violet-200"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300"
                      }`}
                    >
                      {SYSTEM_TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-xl border border-violet-700/35 bg-violet-950/20 p-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">Curriculum by Concept</p>

                    <div className="space-y-2">
                      {groupedSystemConcepts.map((group) => (
                        <section key={group.concept} className="rounded border border-zinc-800 bg-zinc-900/70">
                          <div className="border-b border-zinc-800 px-3 py-2">
                            <p className="text-xs font-semibold text-zinc-200">{group.concept}</p>
                            <p className="text-[11px] text-zinc-400">{group.items.length} item(s)</p>
                          </div>
                          <ul className="max-h-60 overflow-auto">
                            {group.items.map((item) => {
                              const level = inferSystemDesignLevel(item);
                              const selected = item.id === selectedSystemItemId;
                              return (
                                <li key={item.id} className="border-t border-zinc-800 first:border-t-0">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSystemItemId(item.id)}
                                    className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left ${
                                      selected ? "bg-violet-900/30" : "hover:bg-zinc-800/50"
                                    }`}
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                                      <p className="text-[11px] text-zinc-400">{itemTrack(item)}</p>
                                    </div>
                                    <span
                                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                                        level === "EASY"
                                          ? "border-emerald-500/40 text-emerald-300"
                                          : level === "MEDIUM"
                                            ? "border-amber-500/40 text-amber-300"
                                            : "border-rose-500/40 text-rose-300"
                                      }`}
                                    >
                                      {level}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      ))}

                      {groupedSystemConcepts.length === 0 && (
                        <p className="rounded border border-zinc-800 bg-zinc-900/70 p-3 text-sm text-zinc-400">
                          No system concepts found in this track.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                    {!selectedSystemItem ? (
                      <p className="text-sm text-zinc-400">Select a concept item to start.</p>
                    ) : (
                      <>
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">{selectedSystemItem.title}</p>
                            <p className="text-xs text-zinc-400">{inferSystemDesignConcept(selectedSystemItem)} · {itemTrack(selectedSystemItem)}</p>
                          </div>

                          <select
                            value={systemStatus(selectedSystemItem)}
                            onChange={(event) => void onStatusChange(event.target.value as SystemStatus)}
                            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="DRAFTING_NOTES">Drafting Notes</option>
                            <option value="MOCK_INTERVIEWED">Mock Interviewed</option>
                            <option value="CONFIDENT">Confident</option>
                          </select>
                        </div>

                        <div className="mb-3 flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setNotesTab("NOTES")}
                            className={`rounded border px-2 py-1 ${
                              notesTab === "NOTES" ? "border-violet-500 bg-violet-900/40 text-violet-200" : "border-zinc-700 text-zinc-300"
                            }`}
                          >
                            Theory & Notes
                          </button>
                          <button
                            type="button"
                            onClick={() => setNotesTab("RUBRIC")}
                            className={`rounded border px-2 py-1 ${
                              notesTab === "RUBRIC" ? "border-violet-500 bg-violet-900/40 text-violet-200" : "border-zinc-700 text-zinc-300"
                            }`}
                          >
                            Mock Interview Rubric
                          </button>
                        </div>

                        {notesTab === "NOTES" ? (
                          <div className="space-y-2">
                            <textarea
                              value={notesDoc.content}
                              onChange={(event) => setNotesDoc((prev) => ({ ...prev, content: event.target.value }))}
                              className="h-52 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 outline-none"
                              placeholder="Write architecture notes, links, and tradeoffs..."
                            />

                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => void saveSystemNotes()}
                                disabled={notesBusy}
                                className="rounded border border-violet-500/60 bg-violet-950/40 px-3 py-1.5 text-xs font-semibold text-violet-200 disabled:opacity-60"
                              >
                                {notesBusy ? "Saving..." : "Save Notes"}
                              </button>
                              <span className="text-[11px] text-zinc-400">Markdown rendered preview</span>
                            </div>

                            <div className="max-h-52 overflow-auto rounded border border-zinc-800 bg-zinc-950/60 p-2">
                              <MarkdownRenderer content={notesDoc.content} />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm">
                            {[
                              ["requirementsClarified", "Requirements Clarified"],
                              ["estimationDone", "Back-of-the-envelope estimation done"],
                              ["apiDesignDone", "High-level API design complete"],
                              ["schemaDrawn", "Database schema drawn"],
                              ["scalingAddressed", "Bottlenecks and scaling addressed"],
                            ].map(([key, label]) => {
                              const rubric = parseRubric(selectedSystemItem);
                              const checked = rubric[key as keyof RubricState];
                              return (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/60 px-2 py-2 text-zinc-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => void onRubricToggle(key as keyof RubricState, event.target.checked)}
                                  />
                                  <span>{label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            {module === "SETTINGS" && (
              <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Goal Selection</h3>
                  <p className="mt-1 text-xs text-zinc-400">Pick the active sprint goal used by Module A/B and planner.</p>

                  <select
                    value={activeGoalId ?? ""}
                    onChange={async (event) => {
                      const id = event.target.value || null;
                      setActiveGoalId(id);
                      if (id) {
                        try {
                          await loadGoalRuntime(id);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Unable to load goal");
                        }
                      }
                    }}
                    className="mt-3 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  >
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.name} ({goal.startDate} → {goal.endDate})
                      </option>
                    ))}
                  </select>

                  <div className="mt-3 space-y-2 text-xs text-zinc-300">
                    <p>LeetCode selected: {goalProgress?.selected.leetcode ?? 0}</p>
                    <p>System selected: {goalProgress?.selected.systemDesign ?? 0}</p>
                    <p>Due reviews: {goalProgress?.dueReviews.length ?? 0}</p>
                  </div>
                </article>

                <article className="rounded-xl border border-zinc-800 bg-zinc-900/75 p-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Quick Links</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li>
                      <Link href="/bank" className="text-blue-300 hover:underline">
                        Master Bank
                      </Link>
                    </li>
                    <li>
                      <Link href="/frontend" className="text-blue-300 hover:underline">
                        Frontend Interview Prep
                      </Link>
                    </li>
                    <li>
                      <Link href="/goals" className="text-blue-300 hover:underline">
                        Goals
                      </Link>
                    </li>
                  </ul>
                </article>
              </section>
            )}

            {error && <p className="mt-4 rounded border border-rose-600/50 bg-rose-950/20 p-2 text-xs text-rose-300">{error}</p>}
          </div>
        </main>
      </div>

      <div
        className={`pointer-events-none fixed inset-0 z-30 bg-black/45 backdrop-blur-sm transition-opacity ${
          drawerItem ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setDrawerItemId(null)}
      />
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-[40vw] min-w-[360px] border-l border-zinc-800 bg-zinc-950 p-4 shadow-2xl transition-transform duration-300 ${
          drawerItem ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {drawerItem && (
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-sm text-zinc-100">{drawerItem.title}</h3>
              <button type="button" onClick={() => setDrawerItemId(null)} className="text-xs text-zinc-400 hover:text-zinc-200">
                Close
              </button>
            </div>

            <p className={`text-xs font-semibold ${difficultyTone(drawerItem.difficulty)}`}>{drawerItem.difficulty ?? "-"}</p>
            <p className="mt-1 text-xs text-zinc-400">{drawerItem.pattern ?? "Uncategorized"}</p>

            {drawerItem.problemLink && (
              <a
                href={drawerItem.problemLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-fit rounded border border-blue-600/60 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-900/40"
              >
                Open in LeetCode ↗
              </a>
            )}

            <div className="mt-4 space-y-2 text-xs">
              <label className="block">
                <span className="mb-1 block text-zinc-300">Time Complexity</span>
                <input
                  value={timeComplexity}
                  onChange={(event) => setTimeComplexity(event.target.value)}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-zinc-300">Space Complexity</span>
                <input
                  value={spaceComplexity}
                  onChange={(event) => setSpaceComplexity(event.target.value)}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-zinc-300">Minutes Spent</span>
                <input
                  type="number"
                  min={0}
                  value={minutesSpent}
                  onChange={(event) => setMinutesSpent(event.target.value)}
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-zinc-300">Execution Notes</span>
                <textarea
                  value={executionNotes}
                  onChange={(event) => setExecutionNotes(event.target.value)}
                  className="h-28 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                  placeholder="Pattern recognition, edge cases, pitfalls..."
                />
              </label>
            </div>

            <div className="mt-auto border-t border-zinc-800 pt-3">
              {drawerItem.leetcodeOutcome === "SOLVED" && (
                <button
                  type="button"
                  onClick={() => void resetLeetcodeProgress()}
                  disabled={drawerBusy}
                  className="mb-2 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
                >
                  Reset Marked Done
                </button>
              )}
              <p className="mb-2 text-xs text-zinc-400">SRS Feedback</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["AGAIN", "Again (10 min)", "border-rose-500 text-rose-200"],
                  ["HARD", "Hard (1 day)", "border-amber-500 text-amber-200"],
                  ["GOOD", "Good (3 days)", "border-blue-500 text-blue-200"],
                  ["EASY", "Easy (7+ days)", "border-emerald-500 text-emerald-200"],
                ] as Array<[DrawerOutcome, string, string]>).map(([outcome, label, tone]) => (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => void submitSrs(outcome)}
                    disabled={drawerBusy}
                    className={`rounded border bg-zinc-900 px-2 py-2 text-xs font-semibold transition hover:brightness-110 active:scale-95 disabled:opacity-60 ${tone}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {showPlanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-zinc-700 bg-zinc-950 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-zinc-400">Daily Planner</p>
                <h3 className="text-lg font-semibold text-zinc-100">
                  {todayGoalDay ? `${todayGoalDay.date} (${activeGoal?.name ?? "Goal"})` : "No active day"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanner(false)}
                className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-blue-700/40 bg-blue-950/20 p-3">
                <h4 className="text-sm font-semibold text-blue-200">List 1: LeetCode (Due Today)</h4>
                <ul className="mt-2 space-y-2">
                  {dueToday.map((item) => {
                    const already = todayLcEntries.some((entry) => entry.itemId === item.id);
                    return (
                      <li key={item.id} className="rounded border border-zinc-800 bg-zinc-900/80 p-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-zinc-100">{item.title}</p>
                            <p className="text-zinc-400">{item.nextReviewAt ? formatRelative(item.nextReviewAt) : "Due"}</p>
                          </div>
                          <button
                            type="button"
                            disabled={plannerBusy || already || !todayGoalDay}
                            onClick={() => void setGoalDayEntry(item.id, "LEETCODE_SOLVED")}
                            className={`rounded border px-2 py-1 font-semibold ${
                              already
                                ? "border-emerald-500/50 text-emerald-300"
                                : "border-blue-500/60 text-blue-200 disabled:opacity-50"
                            }`}
                          >
                            {already ? "Logged" : "Log done"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  {dueToday.length === 0 && <li className="text-xs text-zinc-400">No due reviews today.</li>}
                </ul>
              </section>

              <section className="rounded-lg border border-violet-700/40 bg-violet-950/20 p-3">
                <h4 className="text-sm font-semibold text-violet-200">List 2: Systems (Today)</h4>

                <div className="mt-2 flex gap-2 text-xs">
                  <select
                    value={plannerSystemPick}
                    onChange={(event) => setPlannerSystemPick(event.target.value)}
                    className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                  >
                    <option value="">Select concept</option>
                    {unplannedSystemItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={plannerBusy || !plannerSystemPick || !todayGoalDay}
                    onClick={() => plannerSystemPick && void setGoalDayEntry(plannerSystemPick, "SYSTEM_DESIGN_READ")}
                    className="rounded border border-violet-500/60 px-2 py-1 font-semibold text-violet-200 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                <ul className="mt-3 space-y-2 text-xs">
                  {todaySdEntries.map((entry) => (
                    <li key={entry.id} className="rounded border border-zinc-800 bg-zinc-900/80 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-zinc-100">{entry.itemTitle}</p>
                          <p className="text-zinc-400">Marked for today</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeGoalDayEntry(entry.id)}
                          disabled={plannerBusy}
                          className="rounded border border-zinc-600 px-2 py-1 text-zinc-300 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                  {todaySdEntries.length === 0 && <li className="text-xs text-zinc-400">No system concepts added for today.</li>}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
