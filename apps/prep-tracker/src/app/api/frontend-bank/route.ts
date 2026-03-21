import { NextResponse } from "next/server";
import {
  FRONTEND_BANK_MANIFEST,
  FRONTEND_TAB_ORDER,
  type FrontendBankItem,
  type FrontendBankResponse,
  type FrontendItemStatus,
  frontendCompletedAt,
  groupBankItems,
  normalizeDifficultyFilter,
  normalizeFrontendSourceFilter,
  normalizeFrontendStatusFilter,
  normalizeFrontendTab,
  normalizeRoundFilter,
  startHereForTab,
  toFrontendBankItem,
} from "@/lib/frontend-bank";
import { listItems } from "@/lib/storage";
import type { PrepItem } from "@/lib/types";

function isDue(item: PrepItem): boolean {
  const completedAt = frontendCompletedAt(item);
  if (!completedAt || !item.nextReviewAt) return false;
  const nextMs = new Date(item.nextReviewAt).getTime();
  return Number.isFinite(nextMs) && nextMs <= Date.now();
}

function isDueToday(item: PrepItem): boolean {
  if (!isDue(item) || !item.nextReviewAt) return false;
  const now = new Date();
  const next = new Date(item.nextReviewAt);
  return (
    next.getUTCFullYear() === now.getUTCFullYear() &&
    next.getUTCMonth() === now.getUTCMonth() &&
    next.getUTCDate() === now.getUTCDate()
  );
}

function isOverdue(item: PrepItem): boolean {
  return isDue(item) && !isDueToday(item);
}

function matchesStatus(view: FrontendBankItem, status: string): boolean {
  if (status === "ALL") return true;
  return view.status === status;
}

function matchesSource(view: FrontendBankItem, source: string): boolean {
  if (source === "ALL") return true;
  return view.sourceKind === source;
}

function matchesDifficulty(view: FrontendBankItem, difficulty: string): boolean {
  if (difficulty === "ALL") return true;
  return (view.item.difficulty ?? view.meta.difficulty ?? "").toLowerCase() === difficulty.toLowerCase();
}

function matchesRound(view: FrontendBankItem, round: string): boolean {
  if (round === "ALL") return true;
  return view.meta.roundTag === round;
}

function matchesQuery(view: FrontendBankItem, q: string): boolean {
  if (!q) return true;
  const haystack = [
    view.item.title,
    view.item.pattern ?? "",
    view.item.systemTopic ?? "",
    view.meta.conceptCluster,
    view.meta.roundTag,
    view.meta.whyItMatters ?? "",
    view.meta.expectedShape ?? "",
    view.meta.reportedContext ?? "",
    view.meta.reportedPrompt ?? "",
    view.meta.practicePrompt ?? "",
    ...(view.item.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = normalizeFrontendTab(searchParams.get("tab"));
  const status = normalizeFrontendStatusFilter(searchParams.get("status"));
  const source = normalizeFrontendSourceFilter(searchParams.get("source"));
  const difficulty = normalizeDifficultyFilter(searchParams.get("difficulty"));
  const round = normalizeRoundFilter(searchParams.get("round"));
  const q = (searchParams.get("q") ?? "").trim();
  const dueOnly = searchParams.get("dueOnly") === "true";

  const allItems = await listItems({ type: "ALL" });
  const frontendItems = allItems.map((item) => toFrontendBankItem(item)).filter((item): item is FrontendBankItem => Boolean(item));

  const summary = frontendItems.reduce<FrontendBankResponse["summary"]>(
    (acc, view) => {
      acc.total += 1;
      if (view.completedAt) acc.completed += 1;
      if (isDueToday(view.item)) acc.dueToday += 1;
      if (isOverdue(view.item)) acc.overdue += 1;
      return acc;
    },
    { total: 0, dueToday: 0, completed: 0, overdue: 0 }
  );

  const tabs = FRONTEND_TAB_ORDER.map((key) => {
    const items = frontendItems.filter((view) => view.meta.frontendTab === key);
    return {
      key,
      label: FRONTEND_BANK_MANIFEST.tabs[key].label,
      total: items.length,
      dueToday: items.filter((view) => isDueToday(view.item)).length,
      completed: items.filter((view) => Boolean(view.completedAt)).length,
      overdue: items.filter((view) => isOverdue(view.item)).length,
    };
  });

  const tabItems = frontendItems.filter((view) => view.meta.frontendTab === tab);
  const manifestOrder = new Map(
    FRONTEND_BANK_MANIFEST.entries
      .filter((entry) => entry.frontendTab === tab)
      .map((entry, index) => [entry.seedKey, index])
  );

  const filtered = tabItems
    .filter((view) => (dueOnly ? view.status === ("DUE" satisfies FrontendItemStatus) : true))
    .filter((view) => matchesStatus(view, status))
    .filter((view) => matchesSource(view, source))
    .filter((view) => matchesDifficulty(view, difficulty))
    .filter((view) => matchesRound(view, round))
    .filter((view) => matchesQuery(view, q))
    .sort((a, b) => {
      const aOrder = manifestOrder.get(a.meta.seedKey) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = manifestOrder.get(b.meta.seedKey) ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.item.title.localeCompare(b.item.title);
    });

  const response: FrontendBankResponse = {
    summary,
    tabs,
    activeTab: {
      key: tab,
      label: FRONTEND_BANK_MANIFEST.tabs[tab].label,
      description: FRONTEND_BANK_MANIFEST.tabs[tab].description,
      startHere: startHereForTab(tab),
      groups: groupBankItems(filtered),
      availableRounds: Array.from(new Set(tabItems.map((view) => view.meta.roundTag))).sort((a, b) => a.localeCompare(b)),
      availableDifficulties: Array.from(new Set(tabItems.map((view) => view.item.difficulty ?? view.meta.difficulty ?? "").filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    },
    filters: {
      tab,
      status,
      source,
      difficulty,
      round,
      q,
      dueOnly,
    },
  };

  return NextResponse.json(response);
}
