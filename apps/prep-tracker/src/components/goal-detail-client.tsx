"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { companySignalsFromItem } from "@/lib/company-signals";
import { LEETCODE_PATTERN_LIBRARY } from "@/lib/leetcode-patterns";
import {
  inferSystemDesignConcept,
  inferSystemDesignLevel,
  SYSTEM_DESIGN_CONCEPTS,
} from "@/lib/system-design-taxonomy";
import type {
  GoalItemRecord,
  GoalProgress,
  GoalRecord,
  PrepItem,
  PrepPacketDay,
  PrepPacketQuestion,
  GoalSessionRecord,
  GoalTargetDimension,
  GoalTargetRecord,
  GoalModuleKind,
  ReviewOutcome,
} from "@/lib/types";
import { formatDate, formatRelative } from "@/lib/ui";

type GoalDetailClientProps = {
  goalId: string;
};

type TabKey = "PROGRESS" | "EXECUTION_PLAN";
type PlannerTab =
  | "LEETCODE"
  | "SYSTEM_BACKEND_CORE"
  | "GENAI_BACKEND_ORCHESTRATION"
  | "GENAI_FRONTEND_LLD"
  | "DISTRIBUTED_SYSTEMS";
type PlannerStatus = "TODO" | "DONE" | "REVIEW_NEXT";

type PacketLcMap = {
  packetDay: number;
  question: PrepPacketQuestion;
  label: string;
  mappedItem: PrepItem | null;
};

const REVIEW_OUTCOMES: ReviewOutcome[] = ["AGAIN", "HARD", "GOOD", "EASY"];
const LC_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
const SD_LEVELS = ["EASY", "MEDIUM", "HARD"] as const;
const SD_TRACK_ORDER = ["backend-core", "genai-backend-orchestration", "genai-frontend-lld", "distributed-systems", "untracked"] as const;
const SD_PLANNER_TABS: Record<Exclude<PlannerTab, "LEETCODE">, { track: string; label: string }> = {
  SYSTEM_BACKEND_CORE: { track: "backend-core", label: "System Design (backend core)" },
  GENAI_BACKEND_ORCHESTRATION: { track: "genai-backend-orchestration", label: "GenAI backend orchestration (RAG/KB)" },
  GENAI_FRONTEND_LLD: { track: "genai-frontend-lld", label: "GenAI frontend + LLD" },
  DISTRIBUTED_SYSTEMS: { track: "distributed-systems", label: "Distributed systems" },
};

function sdTrackRank(track: string): number {
  const idx = SD_TRACK_ORDER.findIndex((entry) => entry === track);
  return idx === -1 ? SD_TRACK_ORDER.length : idx;
}

function sdTrackTone(track: string): string {
  if (track === "backend-core") return "border-slate-300 bg-slate-50";
  if (track === "genai-backend-orchestration") return "border-emerald-300 bg-emerald-50";
  if (track === "genai-frontend-lld") return "border-sky-300 bg-sky-50";
  if (track === "distributed-systems") return "border-indigo-300 bg-indigo-50";
  return "border-amber-300 bg-amber-50";
}

function difficultyRank(raw: string | null | undefined): number {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "easy") return 0;
  if (value === "medium") return 1;
  if (value === "hard") return 2;
  return 3;
}

function targetDimensionLabel(dimension: GoalTargetDimension): string {
  if (dimension === "PATTERN") return "LeetCode Pattern";
  if (dimension === "DIFFICULTY") return "LeetCode Difficulty";
  if (dimension === "COMPANY") return "LeetCode Company";
  if (dimension === "TRACK") return "Module Track";
  if (dimension === "CONCEPT") return "System Concept";
  return "System Level";
}

function itemTrack(item: PrepItem, moduleKind: GoalModuleKind): string {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  if (moduleKind === "SYSTEM_DESIGN") {
    const track = metadata.sdTrack;
    if (typeof track === "string" && track.trim()) return track.trim();
  }

  const tagTrack = (item.tags ?? []).find((tag) => tag.toLowerCase().startsWith("track:"));
  if (tagTrack) return tagTrack.slice("track:".length).trim();
  return moduleKind === "LEETCODE" ? "leetcode" : "untracked";
}

function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${safe}%` }} />
    </div>
  );
}

function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchPacketQuestionToGoalLeetcode(question: PrepPacketQuestion, candidates: PrepItem[]): PrepItem | null {
  const normalizedQuestion = normalizeForMatch(question.title || question.raw);
  const questionSlug = slugify(question.title || question.raw);
  const rawLower = normalizeForMatch(question.raw);
  if (!normalizedQuestion) return null;

  if (rawLower.includes("weakest medium")) {
    return (
      candidates.find(
        (item) => item.difficulty?.toLowerCase() === "medium" && item.leetcodeOutcome !== "SOLVED"
      ) ??
      candidates.find((item) => item.difficulty?.toLowerCase() === "medium") ??
      null
    );
  }

  if (rawLower.includes("hard graph")) {
    return (
      candidates.find(
        (item) =>
          item.difficulty?.toLowerCase() === "hard" &&
          ((item.pattern ?? "").toLowerCase().includes("graph") || item.title.toLowerCase().includes("graph"))
      ) ??
      candidates.find((item) => item.difficulty?.toLowerCase() === "hard") ??
      null
    );
  }

  let best: { item: PrepItem; score: number } | null = null;

  for (const item of candidates) {
    const title = normalizeForMatch(item.title);
    const titleSlug = slugify(item.title);
    const problemSlug = slugify(item.problemSlug ?? "");

    let score = 0;

    if (title && title === normalizedQuestion) score = Math.max(score, 100);
    if (questionSlug && titleSlug && titleSlug === questionSlug) score = Math.max(score, 95);
    if (questionSlug && problemSlug && problemSlug === questionSlug) score = Math.max(score, 95);
    if (title && (title.includes(normalizedQuestion) || normalizedQuestion.includes(title))) score = Math.max(score, 80);
    if (problemSlug && questionSlug && (problemSlug.includes(questionSlug) || questionSlug.includes(problemSlug))) {
      score = Math.max(score, 75);
    }

    if (!best || score > best.score) {
      best = { item, score };
    }
  }

  return best && best.score >= 75 ? best.item : null;
}

function paceBadge(status: GoalProgress["progress"]["paceStatus"]) {
  if (status === "ON_TRACK") {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">On track</span>;
  }
  if (status === "AT_RISK") {
    return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">At risk</span>;
  }
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">No target date</span>;
}

function completionTone(pct: number): string {
  if (pct >= 90) return "text-emerald-700";
  if (pct >= 60) return "text-amber-700";
  return "text-rose-700";
}

function plannerStatusBadge(status: PlannerStatus) {
  if (status === "DONE") {
    return <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">DONE</span>;
  }
  if (status === "REVIEW_NEXT") {
    return <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">REVIEW_NEXT</span>;
  }
  return <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">TODO</span>;
}

function lcPlannerStatus(item: PrepItem): PlannerStatus {
  if (item.leetcodeOutcome !== "SOLVED") return "TODO";
  if (item.shouldReviewAgain) return "REVIEW_NEXT";
  return "DONE";
}

function sdPlannerStatus(item: PrepItem): PlannerStatus {
  if (item.state !== "DONE") return "TODO";
  if (item.shouldReviewAgain) return "REVIEW_NEXT";
  return "DONE";
}

function statusOrder(status: PlannerStatus): number {
  if (status === "TODO") return 0;
  if (status === "REVIEW_NEXT") return 1;
  return 2;
}

type RevisitBucket = "DUE" | "UPCOMING" | "NONE";

function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime();
  if (!Number.isFinite(ms)) return null;
  const diff = Date.now() - ms;
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function revisitBucket(item: PrepItem): RevisitBucket {
  if (!item.shouldReviewAgain) return "NONE";
  if (!item.nextReviewAt) return "DUE";
  const dueMs = new Date(item.nextReviewAt).getTime();
  if (!Number.isFinite(dueMs)) return "DUE";
  return dueMs <= Date.now() ? "DUE" : "UPCOMING";
}

function revisitLabel(item: PrepItem): string {
  const bucket = revisitBucket(item);
  if (bucket === "NONE") return "No revisit queued";
  if (!item.nextReviewAt) return "Review due now";

  const dueMs = new Date(item.nextReviewAt).getTime();
  if (!Number.isFinite(dueMs)) return "Review due now";
  const deltaDays = Math.ceil((dueMs - Date.now()) / (24 * 60 * 60 * 1000));
  if (deltaDays <= 0) return `Review overdue by ${Math.abs(deltaDays)}d`;
  return `Review in ${deltaDays}d`;
}

function reviewDeltaDays(dueAt: string): number {
  const dueMs = new Date(dueAt).getTime();
  if (!Number.isFinite(dueMs)) return 0;
  return Math.ceil((dueMs - Date.now()) / (24 * 60 * 60 * 1000));
}

function reviewDeltaLabel(deltaDays: number): string {
  if (deltaDays < 0) return `${Math.abs(deltaDays)}d overdue`;
  if (deltaDays === 0) return "Due today";
  return `${deltaDays}d left`;
}

function reviewDeltaTone(deltaDays: number): string {
  if (deltaDays < 0) return "border-rose-300 bg-rose-100 text-rose-700";
  if (deltaDays === 0) return "border-amber-300 bg-amber-100 text-amber-700";
  return "border-emerald-300 bg-emerald-100 text-emerald-700";
}

export function GoalDetailClient({ goalId }: GoalDetailClientProps) {
  const [goal, setGoal] = useState<GoalRecord | null>(null);
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [selectedItems, setSelectedItems] = useState<GoalItemRecord[]>([]);
  const [goalTargets, setGoalTargets] = useState<GoalTargetRecord[]>([]);
  const [sessions, setSessions] = useState<GoalSessionRecord[]>([]);
  const [packets, setPackets] = useState<PrepPacketDay[]>([]);
  const [availableLc, setAvailableLc] = useState<PrepItem[]>([]);
  const [availableSd, setAvailableSd] = useState<PrepItem[]>([]);
  const [lcSearch, setLcSearch] = useState("");
  const [sdSearch, setSdSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("PROGRESS");
  const [plannerTab, setPlannerTab] = useState<PlannerTab>("LEETCODE");
  const [plannerSearch, setPlannerSearch] = useState("");
  const [plannerStatusFilter, setPlannerStatusFilter] = useState<"ALL" | PlannerStatus>("ALL");
  const [plannerRevisitFilter, setPlannerRevisitFilter] = useState<"ALL" | RevisitBucket>("ALL");
  const [plannerPatternFilter, setPlannerPatternFilter] = useState("ALL");
  const [plannerDifficultyFilter, setPlannerDifficultyFilter] = useState<"ALL" | "Easy" | "Medium" | "Hard">("ALL");
  const [plannerSdConceptFilter, setPlannerSdConceptFilter] = useState("ALL");
  const [plannerSdLevelFilter, setPlannerSdLevelFilter] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");
  const [plannerTutorialOnly, setPlannerTutorialOnly] = useState(false);
  const [targetModule, setTargetModule] = useState<GoalModuleKind>("LEETCODE");
  const [targetDimension, setTargetDimension] = useState<GoalTargetDimension>("PATTERN");
  const [targetBucket, setTargetBucket] = useState("");
  const [targetCount, setTargetCount] = useState("1");
  const [sessionMinutesDefault, setSessionMinutesDefault] = useState("45");
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const plannerIsLeetcode = plannerTab === "LEETCODE";
  const plannerTrack = plannerIsLeetcode ? null : SD_PLANNER_TABS[plannerTab as Exclude<PlannerTab, "LEETCODE">].track;

  const selectedIds = useMemo(() => new Set(selectedItems.map((entry) => entry.itemId)), [selectedItems]);

  const loadCore = useCallback(async () => {
    setError(null);
    try {
      const [goalRes, progressRes, itemsRes, targetsRes, sessionsRes] = await Promise.all([
        fetch(`/api/goals/${goalId}`, { cache: "no-store" }),
        fetch(`/api/goals/${goalId}/progress`, { cache: "no-store" }),
        fetch(`/api/goals/${goalId}/items`, { cache: "no-store" }),
        fetch(`/api/goals/${goalId}/targets`, { cache: "no-store" }),
        fetch(`/api/goals/${goalId}/sessions?limit=25`, { cache: "no-store" }),
      ]);

      if (!goalRes.ok || !progressRes.ok || !itemsRes.ok || !targetsRes.ok || !sessionsRes.ok) {
        throw new Error("Unable to load goal data");
      }

      const goalJson = (await goalRes.json()) as { goal: GoalRecord };
      const progressJson = (await progressRes.json()) as { progress: GoalProgress };
      const itemsJson = (await itemsRes.json()) as { items: GoalItemRecord[] };
      const targetsJson = (await targetsRes.json()) as { targets: GoalTargetRecord[] };
      const sessionsJson = (await sessionsRes.json()) as { sessions: GoalSessionRecord[] };

      setGoal(goalJson.goal);
      setProgress(progressJson.progress);
      setSelectedItems(itemsJson.items ?? []);
      setGoalTargets(targetsJson.targets ?? []);
      setSessions(sessionsJson.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load goal");
    }
  }, [goalId]);

  const loadAvailable = useCallback(async () => {
    try {
      const [lcRes, sdRes] = await Promise.all([
        fetch(`/api/bank?kind=LEETCODE&q=${encodeURIComponent(lcSearch)}`, { cache: "no-store" }),
        fetch(`/api/bank?kind=SYSTEM_DESIGN&q=${encodeURIComponent(sdSearch)}`, { cache: "no-store" }),
      ]);

      if (!lcRes.ok || !sdRes.ok) {
        throw new Error("Unable to load bank items");
      }

      const lcJson = (await lcRes.json()) as { items: PrepItem[] };
      const sdJson = (await sdRes.json()) as { items: PrepItem[] };

      setAvailableLc(lcJson.items ?? []);
      setAvailableSd(sdJson.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load bank items");
    }
  }, [lcSearch, sdSearch]);

  const loadPackets = useCallback(async () => {
    try {
      const response = await fetch("/api/packets", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load prep packets");
      }
      const json = (await response.json()) as { packets?: PrepPacketDay[] };
      setPackets(json.packets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load prep packets");
    }
  }, []);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    void loadAvailable();
  }, [loadAvailable]);

  useEffect(() => {
    void loadPackets();
  }, [loadPackets]);

  useEffect(() => {
    setPlannerSearch("");
    setPlannerStatusFilter("ALL");
    setPlannerRevisitFilter("ALL");
    setPlannerPatternFilter("ALL");
    setPlannerDifficultyFilter("ALL");
    setPlannerSdConceptFilter("ALL");
    setPlannerSdLevelFilter("ALL");
    setPlannerTutorialOnly(false);
  }, [plannerTab]);

  async function addItem(itemId: string) {
    setBusyItemId(itemId);
    setError(null);
    try {
      const res = await fetch(`/api/goals/${goalId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unable to add item");
      }

      await loadCore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add item");
    } finally {
      setBusyItemId(null);
    }
  }

  async function removeItem(itemId: string) {
    setBusyItemId(itemId);
    setError(null);
    try {
      const res = await fetch(`/api/goals/${goalId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unable to remove item");
      }

      await loadCore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove item");
    } finally {
      setBusyItemId(null);
    }
  }

  async function reviewItem(itemId: string, outcome: ReviewOutcome) {
    setBusyItemId(itemId);
    setError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notesMarkdown: `Goal review: ${goal?.name ?? ""}`, goalId }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unable to log review");
      }

      await loadCore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log review");
    } finally {
      setBusyItemId(null);
    }
  }

  async function patchPlannerItem(itemId: string, patch: Partial<PrepItem>) {
    setBusyItemId(itemId);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unable to update item");
      }

      await loadCore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update planner item");
    } finally {
      setBusyItemId(null);
    }
  }

  async function saveTarget() {
    if (!targetBucket.trim()) {
      setError("Target bucket is required");
      return;
    }

    setBusyItemId("__target__");
    setError(null);
    try {
      const payload = {
        moduleKind: targetModule,
        dimension: targetDimension,
        bucketKey: targetBucket.trim(),
        targetCount: Math.max(0, Number(targetCount) || 0),
      };
      const res = await fetch(`/api/goals/${goalId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unable to save target");
      }

      await loadCore();
      setTargetBucket("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save target");
    } finally {
      setBusyItemId(null);
    }
  }

  async function removeTarget(target: GoalTargetRecord) {
    setBusyItemId(`__target__${target.moduleKind}${target.dimension}${target.bucketKey}`);
    setError(null);
    try {
      const res = await fetch(`/api/goals/${goalId}/targets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKind: target.moduleKind,
          dimension: target.dimension,
          bucketKey: target.bucketKey,
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unable to delete target");
      }
      await loadCore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete target");
    } finally {
      setBusyItemId(null);
    }
  }

  async function logGoalSession(
    item: PrepItem,
    moduleKind: GoalModuleKind,
    action: "LEETCODE_SOLVED" | "SYSTEM_DESIGN_READ" | "PRACTICE" | "REVIEW",
    notesMarkdown = ""
  ) {
    setBusyItemId(item.id);
    setError(null);
    try {
      const minutesSpent = Math.max(0, Number(sessionMinutesDefault) || 0);
      const res = await fetch(`/api/goals/${goalId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKind,
          itemId: item.id,
          action,
          minutesSpent,
          notesMarkdown,
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unable to create session");
      }
      await loadCore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create session");
    } finally {
      setBusyItemId(null);
    }
  }

  async function removeSession(sessionId: string) {
    setBusyItemId(`__session__${sessionId}`);
    setError(null);
    try {
      const res = await fetch(`/api/goals/${goalId}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Unable to delete session");
      }
      await loadCore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete session");
    } finally {
      setBusyItemId(null);
    }
  }

  const availableLcFiltered = useMemo(
    () => availableLc.filter((item) => !selectedIds.has(item.id)),
    [availableLc, selectedIds]
  );
  const availableSdFiltered = useMemo(
    () => availableSd.filter((item) => !selectedIds.has(item.id)),
    [availableSd, selectedIds]
  );

  const goalLeetcodeItems = useMemo(
    () => selectedItems.filter((entry) => entry.moduleKind === "LEETCODE").map((entry) => entry.item),
    [selectedItems]
  );
  const goalSystemItems = useMemo(
    () => selectedItems.filter((entry) => entry.moduleKind === "SYSTEM_DESIGN").map((entry) => entry.item),
    [selectedItems]
  );

  const availableSdGrouped = useMemo(() => {
    const grouped = new Map<string, PrepItem[]>();
    for (const item of availableSdFiltered) {
      const concept = inferSystemDesignConcept(item);
      const arr = grouped.get(concept) ?? [];
      arr.push(item);
      grouped.set(concept, arr);
    }

    return Array.from(grouped.entries())
      .map(([concept, entries]) => ({
        concept,
        entries: entries.sort((a, b) => {
          const order = { EASY: 0, MEDIUM: 1, HARD: 2 } as const;
          const aLevel = inferSystemDesignLevel(a);
          const bLevel = inferSystemDesignLevel(b);
          if (aLevel !== bLevel) return order[aLevel] - order[bLevel];
          return a.title.localeCompare(b.title);
        }),
      }))
      .sort((a, b) => a.concept.localeCompare(b.concept));
  }, [availableSdFiltered]);

  const progressSummary = useMemo(() => {
    if (!progress) {
      return {
        selectionCoveragePct: 0,
        selectionGap: 0,
        expectedMinutesToDate: 0,
        totalLoggedMinutes: 0,
        last7dMinutes: 0,
        daysLeft: 0,
        requiredPerWeek: 0,
      };
    }

    const totalTarget = progress.targets.total;
    const selectedTotal = progress.selected.total;
    const selectionCoveragePct = totalTarget === 0 ? 0 : Math.round((selectedTotal / totalTarget) * 100);
    const selectionGap = Math.max(0, totalTarget - selectedTotal);

    const startMs = new Date(progress.goal.startDate).getTime();
    const elapsedDays = Number.isFinite(startMs) ? Math.max(1, Math.ceil((Date.now() - startMs) / (24 * 60 * 60 * 1000))) : 1;
    const expectedMinutesToDate = elapsedDays * Math.max(15, progress.goal.dailyMinutesTarget);
    const totalLoggedMinutes = progress.sessionsSummary.totalMinutes;
    const last7dMinutes = progress.sessionsSummary.last7dMinutes;

    const endMs = new Date(progress.goal.endDate).getTime();
    const daysLeft = Number.isFinite(endMs) ? Math.max(0, Math.ceil((endMs - Date.now()) / (24 * 60 * 60 * 1000))) : 0;
    const requiredPerWeek =
      daysLeft > 0
        ? Number((progress.progress.overall.remaining / (daysLeft / 7)).toFixed(2))
        : progress.progress.overall.remaining > 0
          ? Number.POSITIVE_INFINITY
          : 0;

    return {
      selectionCoveragePct,
      selectionGap,
      expectedMinutesToDate,
      totalLoggedMinutes,
      last7dMinutes,
      daysLeft,
      requiredPerWeek,
    };
  }, [progress]);

  const companyCoverage = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of goalLeetcodeItems) {
      const signals = companySignalsFromItem(item);
      for (const signal of signals) {
        counts.set(signal.name, (counts.get(signal.name) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [goalLeetcodeItems]);

  const packetLcMappings = useMemo<PacketLcMap[]>(() => {
    const rows: PacketLcMap[] = [];

    for (const packet of packets) {
      const questions = [...packet.codingCore, ...(packet.codingStretch ? [packet.codingStretch] : [])];
      for (const question of questions) {
        const mappedItem = matchPacketQuestionToGoalLeetcode(question, goalLeetcodeItems);
        rows.push({
          packetDay: packet.dayNumber,
          question,
          label: `D${String(packet.dayNumber).padStart(2, "0")} ${question.label}`,
          mappedItem,
        });
      }
    }

    return rows;
  }, [packets, goalLeetcodeItems]);

  const packetRefsByLcItem = useMemo(() => {
    const refs = new Map<string, string[]>();
    for (const row of packetLcMappings) {
      if (!row.mappedItem) continue;
      const arr = refs.get(row.mappedItem.id) ?? [];
      arr.push(row.label);
      refs.set(row.mappedItem.id, arr);
    }
    return refs;
  }, [packetLcMappings]);

  const unresolvedPacketLc = useMemo(
    () => packetLcMappings.filter((row) => !row.mappedItem),
    [packetLcMappings]
  );

  const packetRefsBySdItem = useMemo(() => {
    const refs = new Map<string, string[]>();
    if (goalSystemItems.length === 0) return refs;

    const byConcept = new Map<string, PrepItem[]>();
    for (const item of goalSystemItems) {
      const concept = inferSystemDesignConcept(item);
      const arr = byConcept.get(concept) ?? [];
      arr.push(item);
      byConcept.set(concept, arr);
    }

    const cursors = new Map<string, number>();

    for (const packet of packets) {
      if (!packet.designPrompt) continue;
      const promptConcept = inferSystemDesignConcept({
        title: packet.designPrompt,
        systemTopic: "",
        tags: [],
      });

      const conceptItems = byConcept.get(promptConcept);
      const pool = conceptItems && conceptItems.length > 0 ? conceptItems : goalSystemItems;
      if (pool.length === 0) continue;

      const cursorKey = conceptItems && conceptItems.length > 0 ? promptConcept : "__fallback__";
      const idx = cursors.get(cursorKey) ?? 0;
      const picked = pool[idx % pool.length];
      cursors.set(cursorKey, idx + 1);

      const arr = refs.get(picked.id) ?? [];
      arr.push(`D${String(packet.dayNumber).padStart(2, "0")} Design`);
      refs.set(picked.id, arr);
    }

    return refs;
  }, [packets, goalSystemItems]);

  const plannerPatternOptions = useMemo(() => {
    const patterns = new Set<string>();
    for (const item of goalLeetcodeItems) {
      patterns.add(item.pattern?.trim() || "Uncategorized");
    }
    return Array.from(patterns).sort((a, b) => a.localeCompare(b));
  }, [goalLeetcodeItems]);

  const plannerSdConceptOptions = useMemo(() => {
    const concepts = new Set<string>();
    for (const item of goalSystemItems) {
      concepts.add(inferSystemDesignConcept(item));
    }
    return Array.from(concepts).sort((a, b) => a.localeCompare(b));
  }, [goalSystemItems]);

  const targetDimensionOptions = useMemo<GoalTargetDimension[]>(() => {
    return targetModule === "LEETCODE" ? ["PATTERN", "DIFFICULTY", "COMPANY", "TRACK"] : ["CONCEPT", "LEVEL", "TRACK"];
  }, [targetModule]);

  useEffect(() => {
    if (!targetDimensionOptions.includes(targetDimension)) {
      setTargetDimension(targetDimensionOptions[0] ?? "PATTERN");
      setTargetBucket("");
    }
  }, [targetDimension, targetDimensionOptions]);

  const targetBucketSuggestions = useMemo(() => {
    if (targetModule === "LEETCODE") {
      if (targetDimension === "PATTERN") {
        return LEETCODE_PATTERN_LIBRARY.map((entry) => entry.name);
      }
      if (targetDimension === "DIFFICULTY") {
        return [...LC_DIFFICULTIES];
      }
      if (targetDimension === "TRACK") {
        return ["leetcode"];
      }
      const set = new Set<string>();
      for (const item of goalLeetcodeItems) {
        for (const signal of companySignalsFromItem(item)) {
          set.add(signal.name);
        }
      }
      if (set.size === 0) {
        set.add("Uber");
        set.add("Meta");
        set.add("Google");
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    if (targetDimension === "CONCEPT") {
      return [...SYSTEM_DESIGN_CONCEPTS, "General"];
    }
    if (targetDimension === "TRACK") {
      const tracks = new Set<string>();
      for (const item of goalSystemItems) {
        tracks.add(itemTrack(item, "SYSTEM_DESIGN"));
      }
      return tracks.size > 0
        ? Array.from(tracks).sort((a, b) => a.localeCompare(b))
        : ["backend-core", "genai-backend-orchestration", "genai-frontend-lld", "distributed-systems"];
    }
    return [...SD_LEVELS];
  }, [targetModule, targetDimension, goalLeetcodeItems, goalSystemItems]);

  const groupedTargetCoverage = useMemo(() => {
    const rows = progress?.targetCoverage ?? [];
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${row.moduleKind}::${row.dimension}`;
      const arr = grouped.get(key) ?? [];
      arr.push(row);
      grouped.set(key, arr);
    }
    return Array.from(grouped.entries())
      .map(([key, entries]) => ({
        key,
        moduleKind: entries[0].moduleKind,
        dimension: entries[0].dimension,
        entries: [...entries].sort((a, b) => a.bucketKey.localeCompare(b.bucketKey)),
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [progress?.targetCoverage]);

  const targetCoverageGapCount = useMemo(() => {
    const rows = progress?.targetCoverage ?? [];
    return rows.filter((row) => row.selectedCount < row.targetCount || row.doneCount < row.targetCount).length;
  }, [progress?.targetCoverage]);

  const plannerLeetcode = useMemo(() => {
    const mapped = goalLeetcodeItems.map((item) => {
      const status = lcPlannerStatus(item);
      return {
        item,
        status,
        pattern: item.pattern?.trim() || "Uncategorized",
        difficulty: (item.difficulty ?? "").trim(),
        packetRefs: packetRefsByLcItem.get(item.id) ?? [],
        doneDays: daysSince(item.lastSolvedAt),
        revisit: revisitBucket(item),
      };
    });

    return mapped
      .filter((entry) => {
        if (plannerStatusFilter !== "ALL" && entry.status !== plannerStatusFilter) return false;
        if (plannerPatternFilter !== "ALL" && entry.pattern !== plannerPatternFilter) return false;
        if (plannerDifficultyFilter !== "ALL" && entry.difficulty.toLowerCase() !== plannerDifficultyFilter.toLowerCase()) {
          return false;
        }
        if (plannerRevisitFilter !== "ALL" && entry.revisit !== plannerRevisitFilter) return false;
        if (!plannerSearch.trim()) return true;
        const q = plannerSearch.trim().toLowerCase();
        const hay = [entry.item.title, entry.pattern, entry.difficulty, ...(entry.item.tags ?? [])].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const diffCmp = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
        if (diffCmp !== 0) return diffCmp;
        const statusCmp = statusOrder(a.status) - statusOrder(b.status);
        if (statusCmp !== 0) return statusCmp;
        return a.item.title.localeCompare(b.item.title);
      });
  }, [
    goalLeetcodeItems,
    packetRefsByLcItem,
    plannerStatusFilter,
    plannerPatternFilter,
    plannerDifficultyFilter,
    plannerRevisitFilter,
    plannerSearch,
  ]);

  const groupedPlannerLeetcode = useMemo(() => {
    const grouped = new Map<string, typeof plannerLeetcode>();
    for (const entry of plannerLeetcode) {
      const arr = grouped.get(entry.pattern) ?? [];
      arr.push(entry);
      grouped.set(entry.pattern, arr);
    }

    return Array.from(grouped.entries())
      .map(([pattern, entries]) => ({ pattern, entries }))
      .sort((a, b) => a.pattern.localeCompare(b.pattern));
  }, [plannerLeetcode]);

  const plannerSystem = useMemo(() => {
    const mapped = goalSystemItems.map((item) => {
      const status = sdPlannerStatus(item);
      const concept = inferSystemDesignConcept(item);
      const level = inferSystemDesignLevel(item);
      const track = itemTrack(item, "SYSTEM_DESIGN");
      return {
        item,
        status,
        concept,
        level,
        track,
        packetRefs: packetRefsBySdItem.get(item.id) ?? [],
        doneDays: item.state === "DONE" ? daysSince(item.updatedAt) : null,
        revisit: revisitBucket(item),
        tutorial: item.tags.includes("tutorial") || item.tags.includes("py-tutor"),
      };
    });

    return mapped
      .filter((entry) => {
        if (plannerTrack && entry.track !== plannerTrack) return false;
        if (plannerStatusFilter !== "ALL" && entry.status !== plannerStatusFilter) return false;
        if (plannerSdConceptFilter !== "ALL" && entry.concept !== plannerSdConceptFilter) return false;
        if (plannerSdLevelFilter !== "ALL" && entry.level !== plannerSdLevelFilter) return false;
        if (plannerRevisitFilter !== "ALL" && entry.revisit !== plannerRevisitFilter) return false;
        if (plannerTutorialOnly && !entry.tutorial) return false;
        if (!plannerSearch.trim()) return true;
        const q = plannerSearch.trim().toLowerCase();
        const hay = [entry.item.title, entry.concept, entry.level, entry.track, entry.item.systemTopic ?? "", ...(entry.item.tags ?? [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const levelOrder = { EASY: 0, MEDIUM: 1, HARD: 2 } as const;
        const levelCmp = levelOrder[a.level] - levelOrder[b.level];
        if (levelCmp !== 0) return levelCmp;
        const statusCmp = statusOrder(a.status) - statusOrder(b.status);
        if (statusCmp !== 0) return statusCmp;
        return a.item.title.localeCompare(b.item.title);
      });
  }, [
    goalSystemItems,
    packetRefsBySdItem,
    plannerTrack,
    plannerStatusFilter,
    plannerSdConceptFilter,
    plannerSdLevelFilter,
    plannerRevisitFilter,
    plannerTutorialOnly,
    plannerSearch,
  ]);

  const groupedPlannerSystem = useMemo(() => {
    const byTrack = new Map<string, typeof plannerSystem>();
    for (const entry of plannerSystem) {
      const arr = byTrack.get(entry.track) ?? [];
      arr.push(entry);
      byTrack.set(entry.track, arr);
    }

    return Array.from(byTrack.entries())
      .map(([track, entries]) => {
        const byConcept = new Map<string, typeof plannerSystem>();
        for (const entry of entries) {
          const arr = byConcept.get(entry.concept) ?? [];
          arr.push(entry);
          byConcept.set(entry.concept, arr);
        }

        const concepts = Array.from(byConcept.entries())
          .map(([concept, conceptEntries]) => ({
            concept,
            entries: conceptEntries.sort((a, b) => {
              const levelOrder = { EASY: 0, MEDIUM: 1, HARD: 2 } as const;
              const levelCmp = levelOrder[a.level] - levelOrder[b.level];
              if (levelCmp !== 0) return levelCmp;
              const statusCmp = statusOrder(a.status) - statusOrder(b.status);
              if (statusCmp !== 0) return statusCmp;
              return a.item.title.localeCompare(b.item.title);
            }),
          }))
          .sort((a, b) => a.concept.localeCompare(b.concept));

        return { track, total: entries.length, concepts };
      })
      .sort((a, b) => {
        const rankCmp = sdTrackRank(a.track) - sdTrackRank(b.track);
        if (rankCmp !== 0) return rankCmp;
        return a.track.localeCompare(b.track);
      });
  }, [plannerSystem]);

  const plannerCounts = useMemo(() => {
    const source = plannerIsLeetcode ? plannerLeetcode : plannerSystem;
    return {
      todo: source.filter((entry) => entry.status === "TODO").length,
      done: source.filter((entry) => entry.status === "DONE").length,
      reviewNext: source.filter((entry) => entry.status === "REVIEW_NEXT").length,
      total: source.length,
    };
  }, [plannerIsLeetcode, plannerLeetcode, plannerSystem]);

  const reviewLane = useMemo(() => {
    return [...(progress?.dueReviews ?? [])]
      .map((entry) => ({
        ...entry,
        deltaDays: reviewDeltaDays(entry.dueAt),
      }))
      .sort((a, b) => {
        if (a.deltaDays !== b.deltaDays) return a.deltaDays - b.deltaDays;
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      });
  }, [progress?.dueReviews]);

  const reviewLaneSummary = useMemo(() => {
    return {
      overdue: reviewLane.filter((entry) => entry.deltaDays < 0).length,
      dueToday: reviewLane.filter((entry) => entry.deltaDays === 0).length,
      upcoming: reviewLane.filter((entry) => entry.deltaDays > 0).length,
    };
  }, [reviewLane]);

  if (!goal || !progress) {
    return <p className="text-sm text-slate-500">Loading goal...</p>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/goals" className="text-xs font-semibold text-slate-500 hover:underline">
              ← Back to goals
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{goal.name}</h1>
            <p className="text-sm text-slate-600">
              {goal.startDate} to {goal.endDate} · {goal.status}
            </p>
          </div>
          <div className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700">
            Targets: {goal.leetcodeTarget} LC / {goal.systemDesignTarget} SD
          </div>
        </div>
      </header>

      <section className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <button
          type="button"
          onClick={() => setActiveTab("PROGRESS")}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            activeTab === "PROGRESS" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
          }`}
        >
          Progress
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("EXECUTION_PLAN")}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            activeTab === "EXECUTION_PLAN" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
          }`}
        >
          Execution Planner
        </button>
      </section>

      {activeTab === "PROGRESS" ? (
        <>
          <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
            <h2 className="text-sm font-semibold text-slate-900">How to read this tab</h2>
            <p className="mt-1 text-sm text-slate-700">
              Target completion shows solved/read progress against your numeric goal. Coverage shows whether you selected enough questions/topics in this goal.
            </p>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase text-slate-600">Target Completion</p>
              <p className={`mt-1 text-2xl font-bold ${completionTone(progress.progress.overall.completionPct)}`}>
                {progress.done.total}/{progress.targets.total}
              </p>
              <p className="mt-1 text-xs text-slate-600">{progress.progress.overall.completionPct}% done</p>
              <div className="mt-2">
                <ProgressBar value={progress.progress.overall.completionPct} />
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase text-slate-600">Goal Coverage</p>
              <p className={`mt-1 text-2xl font-bold ${completionTone(progressSummary.selectionCoveragePct)}`}>
                {progress.selected.total}/{progress.targets.total}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {progressSummary.selectionGap > 0 ? `${progressSummary.selectionGap} more items to assign` : "Coverage complete"}
              </p>
              <div className="mt-2">
                <ProgressBar value={progressSummary.selectionCoveragePct} />
              </div>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs uppercase text-slate-600">LeetCode</p>
              <p className={`mt-1 text-2xl font-bold ${completionTone(progress.progress.leetcode.completionPct)}`}>
                {progress.done.leetcode}/{progress.targets.leetcode}
              </p>
              <div className="mt-2">
                <ProgressBar value={progress.progress.leetcode.completionPct} />
              </div>
            </div>

            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs uppercase text-slate-600">System Design</p>
              <p className={`mt-1 text-2xl font-bold ${completionTone(progress.progress.systemDesign.completionPct)}`}>
                {progress.done.systemDesign}/{progress.targets.systemDesign}
              </p>
              <div className="mt-2">
                <ProgressBar value={progress.progress.systemDesign.completionPct} />
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Target Mix Coverage</h3>
              {groupedTargetCoverage.length === 0 ? (
                <p className="text-sm text-slate-500">No target mix configured yet. Add pattern/concept targets to track coverage quality.</p>
              ) : (
                <div className="space-y-3">
                  {groupedTargetCoverage.map((group) => (
                    <div key={group.key} className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-600">
                        {group.moduleKind.replaceAll("_", " ")} · {targetDimensionLabel(group.dimension)}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {group.entries.map((entry) => (
                          <li key={`${group.key}:${entry.bucketKey}`} className="rounded-md border border-slate-200 p-2">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium text-slate-800">{entry.bucketKey}</span>
                              <span className="text-slate-600">
                                selected {entry.selectedCount} · done {entry.doneCount} · target {entry.targetCount}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div>
                                <p className="mb-1 text-[11px] text-slate-500">Selection coverage {entry.coveragePct}%</p>
                                <ProgressBar value={entry.coveragePct} />
                              </div>
                              <div>
                                <p className="mb-1 text-[11px] text-slate-500">Completion coverage {entry.donePct}%</p>
                                <ProgressBar value={entry.donePct} />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Configure Target Mix</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={targetModule}
                    onChange={(e) => setTargetModule(e.target.value as GoalModuleKind)}
                    className="rounded-md border px-2 py-1.5 text-xs"
                  >
                    <option value="LEETCODE">LeetCode</option>
                    <option value="SYSTEM_DESIGN">System Design</option>
                  </select>
                  <select
                    value={targetDimension}
                    onChange={(e) => setTargetDimension(e.target.value as GoalTargetDimension)}
                    className="rounded-md border px-2 py-1.5 text-xs"
                  >
                    {targetDimensionOptions.map((dimension) => (
                      <option key={dimension} value={dimension}>
                        {targetDimensionLabel(dimension)}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  list="goal-target-buckets"
                  value={targetBucket}
                  onChange={(e) => setTargetBucket(e.target.value)}
                  placeholder="Bucket name (e.g. Graphs, Medium, Matching & Dispatch)"
                  className="w-full rounded-md border px-2 py-1.5 text-xs"
                />
                <datalist id="goal-target-buckets">
                  {targetBucketSuggestions.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    value={targetCount}
                    onChange={(e) => setTargetCount(e.target.value)}
                    placeholder="Target count"
                    className="rounded-md border px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={busyItemId === "__target__"}
                    onClick={() => void saveTarget()}
                    className="rounded-md bg-slate-900 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {busyItemId === "__target__" ? "Saving..." : "Save Target"}
                  </button>
                </div>
              </div>

              <ul className="mt-3 space-y-2">
                {goalTargets.length === 0 ? (
                  <li className="text-xs text-slate-500">No target rows yet.</li>
                ) : (
                  goalTargets.slice(0, 12).map((target) => (
                    <li key={`${target.moduleKind}:${target.dimension}:${target.bucketKey}`} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1.5">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {target.bucketKey} <span className="text-slate-500">({target.targetCount})</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {target.moduleKind.replaceAll("_", " ")} · {targetDimensionLabel(target.dimension)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyItemId === `__target__${target.moduleKind}${target.dimension}${target.bucketKey}`}
                        onClick={() => void removeTarget(target)}
                        className="rounded-md border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Pace and Next Actions</h3>
                {paceBadge(progress.progress.paceStatus)}
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>
                  Current velocity: <span className="font-semibold">{progress.progress.overall.velocityPerWeek}/week</span>
                </li>
                <li>
                  Remaining target: <span className="font-semibold">{progress.progress.overall.remaining}</span>
                </li>
                <li>
                  Days left: <span className="font-semibold">{progressSummary.daysLeft}</span>
                </li>
                <li>
                  Required velocity: <span className="font-semibold">{Number.isFinite(progressSummary.requiredPerWeek) ? `${progressSummary.requiredPerWeek}/week` : "Target date passed"}</span>
                </li>
                <li>
                  Execution minutes: <span className="font-semibold">{progressSummary.totalLoggedMinutes}m</span> total · {progressSummary.last7dMinutes}m in last 7d
                </li>
                <li>
                  Expected by now: <span className="font-semibold">{progressSummary.expectedMinutesToDate}m</span> based on daily target
                </li>
              </ul>

              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Immediate actions</p>
                <ul className="mt-2 space-y-1">
                  {progressSummary.selectionGap > 0 && <li>• Add {progressSummary.selectionGap} more items to hit goal coverage.</li>}
                  {targetCoverageGapCount > 0 && <li>• Close {targetCoverageGapCount} target-mix coverage gap{targetCoverageGapCount > 1 ? "s" : ""}.</li>}
                  {progress.dueReviews.length > 0 && <li>• Clear {progress.dueReviews.length} due review{progress.dueReviews.length > 1 ? "s" : ""}.</li>}
                  {progress.progress.paceStatus === "AT_RISK" && <li>• Increase solved/read throughput this week.</li>}
                  {progressSummary.selectionGap === 0 && targetCoverageGapCount === 0 && progress.dueReviews.length === 0 && progress.progress.paceStatus !== "AT_RISK" && (
                    <li>• Continue current plan; you are aligned with targets.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Company Coverage (Selected LeetCode)</h3>
              {companyCoverage.length === 0 ? (
                <p className="text-sm text-slate-500">No company provenance found on selected LeetCode items yet.</p>
              ) : (
                <ul className="space-y-1 text-sm text-slate-700">
                  {companyCoverage.map((entry) => (
                    <li key={entry.name} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1">
                      <span>{entry.name}</span>
                      <span className="text-xs text-slate-500">{entry.count} item{entry.count > 1 ? "s" : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Recent Execution Sessions</h3>
              <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                Default minutes
                <input
                  type="number"
                  min={0}
                  value={sessionMinutesDefault}
                  onChange={(e) => setSessionMinutesDefault(e.target.value)}
                  className="w-16 rounded-md border px-2 py-1 text-xs"
                />
              </label>
            </div>
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-500">No sessions logged yet. Use planner actions to log solved/read work.</p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((session) => (
                  <li key={session.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{session.itemTitle}</p>
                      <p className="text-xs text-slate-600">
                        {session.moduleKind.replaceAll("_", " ")} · {session.action} · {session.minutesSpent}m · {formatRelative(session.sessionAt)}
                      </p>
                      {session.notesMarkdown && <p className="mt-1 text-xs text-slate-500">{session.notesMarkdown}</p>}
                    </div>
                    <button
                      type="button"
                      disabled={busyItemId === `__session__${session.id}`}
                      onClick={() => void removeSession(session.id)}
                      className="rounded-md border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Select LeetCode Items</h3>
              <input
                value={lcSearch}
                onChange={(e) => setLcSearch(e.target.value)}
                placeholder="Search LeetCode bank"
                className="mb-3 w-full rounded-md border px-3 py-2 text-sm"
              />
              <ul className="space-y-2">
                {availableLcFiltered.slice(0, 12).map((item) => {
                  const companies = companySignalsFromItem(item).slice(0, 3);
                  return (
                    <li key={item.id} className="rounded-md border border-slate-200 px-2 py-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">
                            {item.pattern ?? "-"} · {item.difficulty ?? "-"}
                          </p>
                          {companies.length > 0 && (
                            <p className="mt-1 text-[11px] text-slate-600">
                              Asked in: {companies.map((entry) => (entry.score !== null ? `${entry.name} (${entry.score})` : entry.name)).join(", ")}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={busyItemId === item.id}
                          onClick={() => void addItem(item.id)}
                          className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Select System Design Items</h3>
              <input
                value={sdSearch}
                onChange={(e) => setSdSearch(e.target.value)}
                placeholder="Search System Design bank"
                className="mb-3 w-full rounded-md border px-3 py-2 text-sm"
              />
              <div className="space-y-3">
                {availableSdGrouped.length === 0 ? (
                  <p className="text-sm text-slate-500">No system design items available.</p>
                ) : (
                  availableSdGrouped.slice(0, 5).map((group) => (
                    <div key={group.concept} className="rounded-md border border-slate-200 p-2">
                      <p className="text-xs font-semibold uppercase text-slate-600">{group.concept}</p>
                      <ul className="mt-2 space-y-2">
                        {group.entries.slice(0, 4).map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1.5">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                {inferSystemDesignLevel(item)} · {item.systemTopic ?? "-"}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={busyItemId === item.id}
                              onClick={() => void addItem(item.id)}
                              className="rounded-md border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700 disabled:opacity-50"
                            >
                              Add
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Selected Items</h3>
              {selectedItems.length === 0 ? (
                <p className="text-sm text-slate-500">No items selected yet.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedItems.map((entry) => {
                    const companies = entry.moduleKind === "LEETCODE" ? companySignalsFromItem(entry.item).slice(0, 3) : [];
                    return (
                      <li key={entry.itemId} className="rounded-md border border-slate-200 px-2 py-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{entry.item.title}</p>
                            <p className="text-xs text-slate-500">
                              {entry.moduleKind} · selected {formatRelative(entry.selectedAt)}
                            </p>
                            {companies.length > 0 && (
                              <p className="mt-1 text-[11px] text-slate-600">
                                Asked in: {companies.map((company) => (company.score !== null ? `${company.name} (${company.score})` : company.name)).join(", ")}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={busyItemId === entry.itemId}
                            onClick={() => void removeItem(entry.itemId)}
                            className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Review Lane (SM-2)</h3>
              {reviewLane.length === 0 ? (
                <p className="text-sm text-slate-500">No reviews due right now.</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Next Up</p>
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{reviewLane[0].title}</p>
                        <p className="text-xs text-slate-600">
                          {reviewLane[0].moduleKind} · due {formatDate(reviewLane[0].dueAt)} ({formatRelative(reviewLane[0].dueAt)})
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${reviewDeltaTone(reviewLane[0].deltaDays)}`}>
                        {reviewDeltaLabel(reviewLane[0].deltaDays)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {REVIEW_OUTCOMES.map((outcome) => (
                        <button
                          key={`lane-next:${outcome}`}
                          type="button"
                          disabled={busyItemId === reviewLane[0].itemId}
                          onClick={() => void reviewItem(reviewLane[0].itemId, outcome)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
                          {outcome}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
                      Overdue: {reviewLaneSummary.overdue}
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                      Due today: {reviewLaneSummary.dueToday}
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      Upcoming: {reviewLaneSummary.upcoming}
                    </span>
                  </div>

                  <ul className="max-h-72 space-y-2 overflow-auto pr-1">
                    {reviewLane.slice(0, 12).map((entry, idx) => (
                      <li key={entry.itemId} className="rounded-md border border-slate-200 p-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {idx + 1}. {entry.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {entry.moduleKind} · due {formatDate(entry.dueAt)}
                            </p>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${reviewDeltaTone(entry.deltaDays)}`}>
                            {reviewDeltaLabel(entry.deltaDays)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {REVIEW_OUTCOMES.map((outcome) => (
                            <button
                              key={`${entry.itemId}:${outcome}`}
                              type="button"
                              disabled={busyItemId === entry.itemId}
                              onClick={() => void reviewItem(entry.itemId, outcome)}
                              className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                            >
                              {outcome}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Execution Queue (Not Day-Locked)</h3>
            <p className="mt-1 text-sm text-slate-700">
              Work items in any order. Mark `TODO` → `DONE`, then move to `REVIEW_NEXT` and use SM-2 review buttons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <button
              type="button"
              onClick={() => setPlannerTab("LEETCODE")}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                plannerTab === "LEETCODE" ? "bg-emerald-600 text-white" : "border border-slate-300 text-slate-700"
              }`}
            >
              LeetCode Planner
            </button>
            {Object.entries(SD_PLANNER_TABS).map(([tabKey, tabDef]) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setPlannerTab(tabKey as Exclude<PlannerTab, "LEETCODE">)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  plannerTab === tabKey ? "bg-sky-700 text-white" : "border border-slate-300 text-slate-700"
                }`}
              >
                {tabDef.label}
              </button>
            ))}
            <span className="ml-2 text-xs text-slate-500">
              Total {plannerCounts.total} · TODO {plannerCounts.todo} · REVIEW_NEXT {plannerCounts.reviewNext} · DONE {plannerCounts.done}
            </span>
          </div>

          <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3 lg:grid-cols-6">
            <input
              value={plannerSearch}
              onChange={(e) => setPlannerSearch(e.target.value)}
              placeholder="Filter by title/tag"
              className="rounded-md border px-2 py-1 text-xs"
            />
            <select
              value={plannerStatusFilter}
              onChange={(e) => setPlannerStatusFilter(e.target.value as "ALL" | PlannerStatus)}
              className="rounded-md border px-2 py-1 text-xs"
            >
              <option value="ALL">Status: ALL</option>
              <option value="TODO">Status: TODO</option>
              <option value="REVIEW_NEXT">Status: REVIEW_NEXT</option>
              <option value="DONE">Status: DONE</option>
            </select>
            <select
              value={plannerRevisitFilter}
              onChange={(e) => setPlannerRevisitFilter(e.target.value as "ALL" | RevisitBucket)}
              className="rounded-md border px-2 py-1 text-xs"
            >
              <option value="ALL">Revisit: ALL</option>
              <option value="DUE">Revisit: DUE</option>
              <option value="UPCOMING">Revisit: UPCOMING</option>
              <option value="NONE">Revisit: NONE</option>
            </select>

            {plannerIsLeetcode ? (
              <>
                <select
                  value={plannerPatternFilter}
                  onChange={(e) => setPlannerPatternFilter(e.target.value)}
                  className="rounded-md border px-2 py-1 text-xs"
                >
                  <option value="ALL">Pattern: ALL</option>
                  {plannerPatternOptions.map((pattern) => (
                    <option key={pattern} value={pattern}>
                      {pattern}
                    </option>
                  ))}
                </select>
                <select
                  value={plannerDifficultyFilter}
                  onChange={(e) => setPlannerDifficultyFilter(e.target.value as "ALL" | "Easy" | "Medium" | "Hard")}
                  className="rounded-md border px-2 py-1 text-xs"
                >
                  <option value="ALL">Difficulty: ALL</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <div className="text-xs text-slate-500">
                  Grouped by pattern
                </div>
              </>
            ) : (
              <>
                <select
                  value={plannerSdConceptFilter}
                  onChange={(e) => setPlannerSdConceptFilter(e.target.value)}
                  className="rounded-md border px-2 py-1 text-xs"
                >
                  <option value="ALL">Concept: ALL</option>
                  {plannerSdConceptOptions.map((concept) => (
                    <option key={concept} value={concept}>
                      {concept}
                    </option>
                  ))}
                </select>
                <select
                  value={plannerSdLevelFilter}
                  onChange={(e) => setPlannerSdLevelFilter(e.target.value as "ALL" | "EASY" | "MEDIUM" | "HARD")}
                  className="rounded-md border px-2 py-1 text-xs"
                >
                  <option value="ALL">Level: ALL</option>
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
                <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={plannerTutorialOnly}
                    onChange={(e) => setPlannerTutorialOnly(e.target.checked)}
                  />
                  Tutorial only
                </label>
              </>
            )}
          </div>

          {plannerIsLeetcode ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Packet Mapping (Auto-reviewed)</h3>
                <p className="text-xs text-slate-600">Packet coding questions are automatically mapped to your selected LeetCode items.</p>
                {unresolvedPacketLc.length > 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    Unresolved packet questions: {unresolvedPacketLc.length} (mostly placeholders like &quot;Weakest medium&quot;).
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {groupedPlannerLeetcode.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    No LeetCode planner items match current filters.
                  </p>
                ) : (
                  groupedPlannerLeetcode.map((group) => (
                    <div key={group.pattern} className="rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
                        <p className="text-sm font-semibold text-slate-900">{group.pattern}</p>
                        <span className="text-xs text-slate-500">{group.entries.length} items</span>
                      </div>
                      <ul className="space-y-3 p-4">
                        {group.entries.map((entry) => {
                          const { item, status, packetRefs, doneDays } = entry;
                          const companies = companySignalsFromItem(item).slice(0, 4);
                          const revisitText = revisitLabel(item);
                          const doneText = doneDays === null ? "Never solved" : `${doneDays}d since last done`;

                          return (
                            <li key={item.id} className="rounded-lg border border-slate-200 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="mb-1 flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                    {plannerStatusBadge(status)}
                                  </div>
                                  <p className="text-xs text-slate-500">{item.difficulty ?? "-"} · {item.pattern ?? "-"}</p>
                                  <p className="mt-1 text-xs text-slate-600">
                                    Attempts: {item.attemptCount ?? 0} · Last solved: {formatDate(item.lastSolvedAt)} · {doneText}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-600">
                                    Revisit: <span className={entry.revisit === "DUE" ? "font-semibold text-amber-700" : "text-slate-700"}>{revisitText}</span>
                                    {" · "}next review {formatDate(item.nextReviewAt)}
                                  </p>

                                  {packetRefs.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {packetRefs.slice(0, 8).map((ref) => (
                                        <span key={`${item.id}:${ref}`} className="rounded-full border border-indigo-300 bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                          {ref}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {companies.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {companies.map((company) => (
                                        <span key={`${item.id}:${company.name}`} className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                          {company.score !== null ? `${company.name} ${company.score}` : company.name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Link href={`/items/${item.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                                    Open Item
                                  </Link>

                                  {status === "TODO" && (
                                    <button
                                      type="button"
                                      disabled={busyItemId === item.id}
                                      onClick={() => void logGoalSession(item, "LEETCODE", "LEETCODE_SOLVED", "Planner completion")}
                                      className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                                    >
                                      Mark Done
                                    </button>
                                  )}

                                  {status === "DONE" && (
                                    <button
                                      type="button"
                                      disabled={busyItemId === item.id}
                                      onClick={() =>
                                        void patchPlannerItem(item.id, {
                                          shouldReviewAgain: true,
                                          nextReviewAt: new Date().toISOString(),
                                        })
                                      }
                                      className="rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 disabled:opacity-50"
                                    >
                                      Needs Review Next
                                    </button>
                                  )}

                                  {status === "REVIEW_NEXT" && (
                                    <button
                                      type="button"
                                      disabled={busyItemId === item.id}
                                      onClick={() =>
                                        void patchPlannerItem(item.id, {
                                          shouldReviewAgain: false,
                                          nextReviewAt: null,
                                        })
                                      }
                                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                                    >
                                      Mark Stable
                                    </button>
                                  )}

                                  {status !== "TODO" && (
                                    <button
                                      type="button"
                                      disabled={busyItemId === item.id}
                                      onClick={() =>
                                        void patchPlannerItem(item.id, {
                                          leetcodeOutcome: "TODO",
                                          shouldReviewAgain: false,
                                          nextReviewAt: null,
                                        })
                                      }
                                      className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50"
                                    >
                                      Reset to TODO
                                    </button>
                                  )}

                                  {status === "REVIEW_NEXT" &&
                                    REVIEW_OUTCOMES.map((outcome) => (
                                      <button
                                        key={`${item.id}:${outcome}`}
                                        type="button"
                                        disabled={busyItemId === item.id}
                                        onClick={() => void reviewItem(item.id, outcome)}
                                        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                                      >
                                        {outcome}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  {plannerTrack ? SD_PLANNER_TABS[plannerTab as Exclude<PlannerTab, "LEETCODE">].label : "System Design Tracks"}
                </h3>
                <p className="mt-1 text-xs text-slate-700">
                  Items are track-scoped by tab and ordered from easy to hard within each concept.
                </p>
              </div>
              <div className="space-y-3">
                {groupedPlannerSystem.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    No system design planner items match current filters.
                  </div>
                ) : (
                  groupedPlannerSystem.map((trackGroup) => (
                    <div key={trackGroup.track} className={`rounded-xl border ${sdTrackTone(trackGroup.track)}`}>
                      <div className="flex items-center justify-between border-b border-white/70 px-4 py-2">
                        <p className="text-sm font-semibold text-slate-900">{trackGroup.track}</p>
                        <span className="text-xs text-slate-600">{trackGroup.total} items</span>
                      </div>
                      <div className="space-y-3 p-3">
                        {trackGroup.concepts.map((conceptGroup) => (
                          <div key={`${trackGroup.track}:${conceptGroup.concept}`} className="rounded-xl border border-slate-200 bg-white">
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
                              <p className="text-sm font-semibold text-slate-900">{conceptGroup.concept}</p>
                              <span className="text-xs text-slate-500">{conceptGroup.entries.length} items</span>
                            </div>
                            <ul className="space-y-3 p-4">
                              {conceptGroup.entries.map((entry) => {
                                const { item, status, concept, level, track, packetRefs, doneDays } = entry;
                                const revisitText = revisitLabel(item);
                                const doneText = doneDays === null ? "Not completed yet" : `${doneDays}d since last done`;
                                return (
                                  <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <div className="mb-1 flex items-center gap-2">
                                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                          {plannerStatusBadge(status)}
                                        </div>
                                        <p className="text-xs text-slate-500">{concept} · {level} · {track}</p>
                                        <p className="mt-1 text-xs text-slate-600">
                                          State: {item.state} · {doneText}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                          Revisit:{" "}
                                          <span className={entry.revisit === "DUE" ? "font-semibold text-amber-700" : "text-slate-700"}>{revisitText}</span>
                                          {" · "}next review {formatDate(item.nextReviewAt)}
                                        </p>

                                        {packetRefs.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {packetRefs.slice(0, 8).map((ref) => (
                                              <span
                                                key={`${item.id}:${ref}`}
                                                className="rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700"
                                              >
                                                {ref}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2">
                                        <Link href={`/items/${item.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                                          Open Item
                                        </Link>
                                        <Link
                                          href={`/bank/system-design/${item.id}`}
                                          className="rounded-md border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700"
                                        >
                                          Edit Markdown
                                        </Link>

                                        {status === "TODO" && (
                                          <button
                                            type="button"
                                            disabled={busyItemId === item.id}
                                            onClick={() => void logGoalSession(item, "SYSTEM_DESIGN", "SYSTEM_DESIGN_READ", "Planner completion")}
                                            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                                          >
                                            Mark Done
                                          </button>
                                        )}

                                        {status === "DONE" && (
                                          <button
                                            type="button"
                                            disabled={busyItemId === item.id}
                                            onClick={() =>
                                              void patchPlannerItem(item.id, {
                                                shouldReviewAgain: true,
                                                nextReviewAt: new Date().toISOString(),
                                              })
                                            }
                                            className="rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 disabled:opacity-50"
                                          >
                                            Needs Review Next
                                          </button>
                                        )}

                                        {status === "REVIEW_NEXT" && (
                                          <button
                                            type="button"
                                            disabled={busyItemId === item.id}
                                            onClick={() =>
                                              void patchPlannerItem(item.id, {
                                                shouldReviewAgain: false,
                                                nextReviewAt: null,
                                              })
                                            }
                                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                                          >
                                            Mark Stable
                                          </button>
                                        )}

                                        {status !== "TODO" && (
                                          <button
                                            type="button"
                                            disabled={busyItemId === item.id}
                                            onClick={() =>
                                              void patchPlannerItem(item.id, {
                                                state: "ACTIVE",
                                                shouldReviewAgain: false,
                                                nextReviewAt: null,
                                              })
                                            }
                                            className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50"
                                          >
                                            Reset to TODO
                                          </button>
                                        )}

                                        {status === "REVIEW_NEXT" &&
                                          REVIEW_OUTCOMES.map((outcome) => (
                                            <button
                                              key={`${item.id}:${outcome}`}
                                              type="button"
                                              disabled={busyItemId === item.id}
                                              onClick={() => void reviewItem(item.id, outcome)}
                                              className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                                            >
                                              {outcome}
                                            </button>
                                          ))}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      )}

      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
