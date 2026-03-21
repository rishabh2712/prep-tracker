"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { ReviewOutcome } from "@/lib/types";
import {
  type FrontendBankItem,
  type FrontendBankResponse,
  type FrontendSourceFilter,
  type FrontendStatusFilter,
  type FrontendTabKey,
  FRONTEND_SOURCE_FILTERS,
  FRONTEND_STATUS_FILTERS,
  normalizeDifficultyFilter,
  normalizeFrontendSourceFilter,
  normalizeFrontendStatusFilter,
  normalizeFrontendTab,
  normalizeRoundFilter,
} from "@/lib/frontend-bank";
import { formatDate, formatRelative } from "@/lib/ui";

const TAB_ACCENTS: Record<FrontendTabKey, string> = {
  "js-async": "from-sky-500/25 to-cyan-500/15 border-sky-500/30",
  "react-browser": "from-emerald-500/25 to-lime-500/15 border-emerald-500/30",
  "frontend-coding": "from-amber-500/25 to-orange-500/15 border-amber-500/30",
  dsa: "from-violet-500/25 to-indigo-500/15 border-violet-500/30",
  "design-behavior": "from-rose-500/25 to-fuchsia-500/15 border-rose-500/30",
};

const STATUS_TONES: Record<string, string> = {
  NOT_STARTED: "border-zinc-700 bg-zinc-900 text-zinc-300",
  DUE: "border-rose-500/50 bg-rose-950/40 text-rose-200",
  SCHEDULED: "border-sky-500/40 bg-sky-950/30 text-sky-200",
  DONE: "border-emerald-500/40 bg-emerald-950/25 text-emerald-200",
};

const STATUS_DOT_TONES: Record<string, string> = {
  NOT_STARTED: "bg-zinc-500",
  DUE: "bg-rose-400",
  SCHEDULED: "bg-sky-400",
  DONE: "bg-emerald-400",
};

const SOURCE_TONES: Record<Exclude<FrontendSourceFilter, "ALL">, string> = {
  CONCEPT: "border-sky-500/40 bg-sky-950/25 text-sky-200",
  REPORTED: "border-amber-500/40 bg-amber-950/25 text-amber-200",
  RECOVERY: "border-violet-500/40 bg-violet-950/25 text-violet-200",
};

const PRIORITY_TONES: Record<string, string> = {
  mvp: "border-emerald-500/40 bg-emerald-950/25 text-emerald-200",
  core: "border-zinc-700 bg-zinc-900 text-zinc-300",
  stretch: "border-fuchsia-500/40 bg-fuchsia-950/25 text-fuchsia-200",
};

const REVIEW_BUTTONS: Array<{ label: string; outcome: ReviewOutcome; tone: string }> = [
  { label: "Again", outcome: "AGAIN", tone: "border-rose-500/40 text-rose-200 hover:bg-rose-950/40" },
  { label: "Hard", outcome: "HARD", tone: "border-amber-500/40 text-amber-200 hover:bg-amber-950/40" },
  { label: "Good", outcome: "GOOD", tone: "border-sky-500/40 text-sky-200 hover:bg-sky-950/40" },
  { label: "Easy", outcome: "EASY", tone: "border-emerald-500/40 text-emerald-200 hover:bg-emerald-950/40" },
];

async function parseError(response: Response): Promise<string> {
  try {
    const json = await response.json();
    return json.error ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

function difficultyTone(value: string | null | undefined): string {
  const raw = (value ?? "").toLowerCase();
  if (raw === "easy") return "text-emerald-300";
  if (raw === "medium") return "text-amber-300";
  if (raw === "hard") return "text-rose-300";
  return "text-zinc-300";
}

function resultCount(data: FrontendBankResponse | null): number {
  if (!data) return 0;
  return data.activeTab.groups.reduce((sum, group) => sum + group.items.length, 0);
}

function itemDifficulty(view: FrontendBankItem): string {
  return view.item.difficulty ?? view.meta.difficulty ?? view.meta.level ?? "-";
}

function itemStatusHint(view: FrontendBankItem): string {
  if (view.status === "DUE" && view.item.nextReviewAt) {
    return `Due ${formatRelative(view.item.nextReviewAt)}`;
  }
  if (view.status === "SCHEDULED" && view.item.nextReviewAt) {
    return `Review ${formatRelative(view.item.nextReviewAt)}`;
  }
  if (view.completedAt) {
    return `Last done ${formatRelative(view.completedAt)}`;
  }
  return view.meta.roundTag;
}

function primaryPrompt(view: FrontendBankItem): string {
  return view.meta.practicePrompt ?? view.meta.reportedPrompt ?? view.meta.whyItMatters ?? "No prompt added yet.";
}

function progressPct(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function FrontendBankClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = normalizeFrontendTab(searchParams.get("tab"));
  const status = normalizeFrontendStatusFilter(searchParams.get("status"));
  const source = normalizeFrontendSourceFilter(searchParams.get("source"));
  const difficulty = normalizeDifficultyFilter(searchParams.get("difficulty"));
  const round = normalizeRoundFilter(searchParams.get("round"));
  const dueOnly = searchParams.get("dueOnly") === "true";
  const q = (searchParams.get("q") ?? "").trim();
  const selectedItemId = (searchParams.get("item") ?? "").trim();

  const [data, setData] = useState<FrontendBankResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(q);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (status !== "ALL") params.set("status", status);
    if (source !== "ALL") params.set("source", source);
    if (difficulty !== "ALL") params.set("difficulty", difficulty);
    if (round !== "ALL") params.set("round", round);
    if (q) params.set("q", q);
    if (dueOnly) params.set("dueOnly", "true");
    return params.toString();
  }, [difficulty, dueOnly, q, round, source, status, tab]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/frontend-bank?${queryString}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      const json = (await res.json()) as FrontendBankResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load frontend bank");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateFilters(
    patch: Partial<Record<"tab" | "status" | "source" | "difficulty" | "round" | "q" | "dueOnly" | "item", string | boolean>>
  ) {
    const params = new URLSearchParams(searchParams.toString());

    const nextTab = typeof patch.tab === "string" ? patch.tab : tab;
    params.set("tab", nextTab);

    const nextStatus = typeof patch.status === "string" ? patch.status : status;
    if (nextStatus && nextStatus !== "ALL") params.set("status", nextStatus);
    else params.delete("status");

    const nextSource = typeof patch.source === "string" ? patch.source : source;
    if (nextSource && nextSource !== "ALL") params.set("source", nextSource);
    else params.delete("source");

    const nextDifficulty = typeof patch.difficulty === "string" ? patch.difficulty : difficulty;
    if (nextDifficulty && nextDifficulty !== "ALL") params.set("difficulty", nextDifficulty);
    else params.delete("difficulty");

    const nextRound = typeof patch.round === "string" ? patch.round : round;
    if (nextRound && nextRound !== "ALL") params.set("round", nextRound);
    else params.delete("round");

    const nextQ = typeof patch.q === "string" ? patch.q : q;
    if (nextQ.trim()) params.set("q", nextQ.trim());
    else params.delete("q");

    const nextDueOnly = typeof patch.dueOnly === "boolean" ? patch.dueOnly : dueOnly;
    if (nextDueOnly) params.set("dueOnly", "true");
    else params.delete("dueOnly");

    const filterTouched =
      "tab" in patch || "status" in patch || "source" in patch || "difficulty" in patch || "round" in patch || "q" in patch || "dueOnly" in patch;

    if (typeof patch.item === "string") {
      if (patch.item.trim()) params.set("item", patch.item.trim());
      else params.delete("item");
    } else if (filterTouched) {
      params.delete("item");
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  async function reviewItem(itemId: string, outcome: ReviewOutcome) {
    setBusyItemId(itemId);
    setError(null);
    try {
      const res = await fetch(`/api/items/${itemId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notesMarkdown: "" }),
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save review");
    } finally {
      setBusyItemId(null);
    }
  }

  async function resetItem(view: FrontendBankItem) {
    setBusyItemId(view.item.id);
    setError(null);
    try {
      const patch: Record<string, unknown> = {
        nextReviewAt: null,
        lastReviewedAt: null,
        reviewIntervalDays: 7,
        shouldReviewAgain: true,
      };

      if (view.item.type === "LEETCODE") {
        patch.leetcodeOutcome = "TODO";
        patch.lastSolvedAt = null;
      }

      if (view.item.type !== "LEETCODE") {
        patch.state = "ACTIVE";
      }

      const res = await fetch(`/api/items/${view.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        throw new Error(await parseError(res));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset item");
    } finally {
      setBusyItemId(null);
    }
  }

  const filteredCount = resultCount(data);
  const activeTabStat = data?.tabs.find((entry) => entry.key === tab) ?? null;
  const visibleItems = useMemo(() => data?.activeTab.groups.flatMap((group) => group.items) ?? [], [data]);
  const selectedView = useMemo(() => {
    if (visibleItems.length === 0) return null;
    return visibleItems.find((view) => view.item.id === selectedItemId) ?? visibleItems[0];
  }, [selectedItemId, visibleItems]);

  return (
    <div className="space-y-6 text-zinc-100">
      <header className={`rounded-3xl border bg-gradient-to-br p-6 ${TAB_ACCENTS[tab]}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.22em] text-zinc-300">
              <Link href="/" className="hover:text-white">
                ← Dashboard
              </Link>
              <Link href="/bank" className="hover:text-white">
                Master Bank
              </Link>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Frontend Interview Prep</h1>
            <p className="mt-2 text-sm text-zinc-300">
              This view is now optimized for study flow: scan the queue, select one item, then work from the detail pane instead of parsing full cards.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Surface Total", value: data?.summary.total ?? 0, tone: "text-white" },
              { label: "Due Today", value: data?.summary.dueToday ?? 0, tone: "text-sky-200" },
              { label: "Completed", value: data?.summary.completed ?? 0, tone: "text-emerald-200" },
              { label: "Overdue", value: data?.summary.overdue ?? 0, tone: "text-rose-200" },
            ].map((card) => (
              <article key={card.label} className="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{card.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-400">Search</span>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") updateFilters({ q: searchInput });
              }}
              placeholder="Search prompts, tags, concepts, or rounds"
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
            />
          </label>

          <button
            type="button"
            onClick={() => updateFilters({ q: searchInput })}
            className="self-end rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-600"
          >
            Apply Search
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              updateFilters({ status: "ALL", source: "ALL", difficulty: "ALL", round: "ALL", q: "", dueOnly: false, item: "" });
            }}
            className="self-end rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-600"
          >
            Reset View
          </button>
        </div>
      </header>

      {error && <p className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-3 text-sm text-rose-200">{error}</p>}

      <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_420px]">
        <aside className="space-y-4">
          <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Queue Focus</p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-100">Start from due work</h2>
              </div>
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                {data?.summary.dueToday ?? 0} due
              </span>
            </div>

            <button
              type="button"
              onClick={() => updateFilters({ dueOnly: !dueOnly })}
              className={`mt-4 w-full rounded-2xl border px-4 py-3 text-left transition ${
                dueOnly ? "border-sky-500/50 bg-sky-950/30 text-sky-100" : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700"
              }`}
            >
              <p className="text-sm font-semibold">{dueOnly ? "Due-only mode is on" : "Focus due work first"}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {dueOnly ? "Showing only items that should be reviewed now." : "Turn this on to cut the queue down to immediate work."}
              </p>
            </button>
          </article>

          <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Categories</p>
            <div className="mt-4 space-y-2">
              {data?.tabs.map((entry) => {
                const active = entry.key === tab;
                const pct = progressPct(entry.completed, entry.total);

                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        tab: entry.key,
                        status: "ALL",
                        source: "ALL",
                        difficulty: "ALL",
                        round: "ALL",
                        dueOnly: false,
                        item: "",
                      })
                    }
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active ? "border-emerald-500/50 bg-emerald-950/30" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-zinc-100">{entry.label}</p>
                      <span className="text-xs text-zinc-400">
                        {entry.completed}/{entry.total}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {entry.dueToday} due today · {entry.overdue} overdue
                    </p>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Active Track</p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-100">{data?.activeTab.label ?? "Loading..."}</h2>
            <p className="mt-2 text-sm text-zinc-400">{data?.activeTab.description}</p>
            {data?.activeTab.startHere.length ? (
              <div className="mt-4 space-y-3">
                {data.activeTab.startHere.slice(0, 2).map((block) => (
                  <div key={block.title} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                    <p className="text-sm font-semibold text-zinc-100">{block.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{block.items.slice(0, 4).map((item) => item.bankId).join(" · ")}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </aside>

        <div className="space-y-4">
          <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex flex-wrap items-end gap-3">
              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">Status</span>
                <select
                  value={status}
                  onChange={(event) => updateFilters({ status: event.target.value as FrontendStatusFilter })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  {FRONTEND_STATUS_FILTERS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">Source</span>
                <select
                  value={source}
                  onChange={(event) => updateFilters({ source: event.target.value as FrontendSourceFilter })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  {FRONTEND_SOURCE_FILTERS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">Difficulty</span>
                <select
                  value={difficulty}
                  onChange={(event) => updateFilters({ difficulty: event.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="ALL">ALL</option>
                  {data?.activeTab.availableDifficulties.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-500">Round</span>
                <select
                  value={round}
                  onChange={(event) => updateFilters({ round: event.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="ALL">ALL</option>
                  {data?.activeTab.availableRounds.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
              <span>{filteredCount} items in this queue</span>
              {activeTabStat && <span>{activeTabStat.completed} completed in this category</span>}
              {activeTabStat && <span>{activeTabStat.dueToday} due today</span>}
            </div>
          </article>

          {loading ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400">Loading frontend queue…</div>
          ) : filteredCount === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400">
              No items match this view yet. If the bank has not been seeded, run <span className="font-mono text-zinc-200">npm run tracker:seed:frontend:bank</span> while the app is running.
            </div>
          ) : (
            data?.activeTab.groups.map((group) => (
              <section key={group.conceptCluster} className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-2 pb-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Concept Cluster</p>
                    <h2 className="mt-1 text-base font-semibold text-zinc-100">{group.conceptCluster}</h2>
                  </div>
                  <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                    {group.items.length} items
                  </span>
                </div>

                <div className="mt-2 divide-y divide-zinc-800">
                  {group.items.map((view) => {
                    const selected = selectedView?.item.id === view.item.id;
                    return (
                      <button
                        key={view.item.id}
                        type="button"
                        onClick={() => updateFilters({ item: view.item.id })}
                        className={`flex w-full items-start gap-3 px-2 py-3 text-left transition ${
                          selected ? "rounded-2xl bg-zinc-950/80" : "hover:bg-zinc-950/50"
                        }`}
                      >
                        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_TONES[view.status]}`} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-100">
                                {view.meta.bankId ? `${view.meta.bankId} · ` : ""}
                                {view.item.title}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">{itemStatusHint(view)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${STATUS_TONES[view.status]}`}>
                                {view.status.toLowerCase().replaceAll("_", " ")}
                              </span>
                              <span className={`text-xs font-semibold ${difficultyTone(itemDifficulty(view))}`}>{itemDifficulty(view)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          {!selectedView ? (
            <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-400">
              Pick an item from the queue to see the prompt, history, and actions.
            </article>
          ) : (
            <>
              <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedView.meta.bankId && (
                    <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                      {selectedView.meta.bankId}
                    </span>
                  )}
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase ${STATUS_TONES[selectedView.status]}`}>
                    {selectedView.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase ${SOURCE_TONES[selectedView.sourceKind]}`}>
                    {selectedView.sourceKind.toLowerCase()}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase ${PRIORITY_TONES[selectedView.meta.priority]}`}>
                    {selectedView.meta.priority}
                  </span>
                  <span className={`text-sm font-medium ${difficultyTone(itemDifficulty(selectedView))}`}>{itemDifficulty(selectedView)}</span>
                </div>

                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-100">{selectedView.item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{primaryPrompt(selectedView)}</p>

                <div className="mt-5 grid gap-3">
                  <Link
                    href={`/items/${selectedView.item.id}`}
                    className="flex items-center justify-center rounded-2xl border border-emerald-500/50 bg-emerald-950/40 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900/50"
                  >
                    Start Practice Session
                  </Link>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedView.item.problemLink ? (
                      <a
                        href={selectedView.item.problemLink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-zinc-700 px-4 py-3 text-center text-sm font-medium text-zinc-200 hover:border-zinc-600"
                      >
                        Open Problem ↗
                      </a>
                    ) : (
                      <div className="rounded-2xl border border-zinc-800 px-4 py-3 text-center text-sm text-zinc-500">No external prompt link</div>
                    )}

                    <button
                      type="button"
                      disabled={busyItemId === selectedView.item.id}
                      onClick={() => void resetItem(selectedView)}
                      className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-600 disabled:opacity-50"
                    >
                      Reset Progress
                    </button>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Prompt</p>
                {selectedView.meta.reportedContext && (
                  <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">Reported In</p>
                    <p className="mt-2 text-sm text-amber-100">{selectedView.meta.reportedContext}</p>
                  </div>
                )}
                {selectedView.meta.reportedPrompt && (
                  <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">Source Prompt</p>
                    <p className="mt-2 text-sm text-amber-100">{selectedView.meta.reportedPrompt}</p>
                  </div>
                )}
                {selectedView.meta.practicePrompt && (
                  <div className="mt-3 rounded-2xl border border-sky-500/20 bg-sky-950/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300/80">Practice Version</p>
                    <p className="mt-2 text-sm text-sky-100">{selectedView.meta.practicePrompt}</p>
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Expected Shape</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{selectedView.meta.expectedShape ?? "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Session Logistics</p>
                    <p className="mt-2 text-sm text-zinc-100">{selectedView.meta.roundTag}</p>
                    <p className="mt-1 text-xs text-zinc-500">Time box {selectedView.meta.timebox ?? "-"}</p>
                  </div>
                </div>
              </article>

              {selectedView.meta.studyGuideMarkdown ? (
                <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Detailed Brief</p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-100">Interview-ready description</h3>
                    </div>
                    <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-[11px] text-zinc-400">
                      {selectedView.meta.timebox ?? "-"}
                    </span>
                  </div>

                  <div className="mt-4 max-h-[360px] overflow-auto pr-1">
                    <MarkdownRenderer
                      content={selectedView.meta.studyGuideMarkdown}
                      className="text-sm leading-6 text-zinc-200"
                    />
                  </div>
                </article>
              ) : null}

              <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">After Practice</p>
                    <h3 className="mt-2 text-base font-semibold text-zinc-100">Review scheduling</h3>
                  </div>
                  {selectedView.completedAt && (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-950/25 px-3 py-1 text-xs text-emerald-200">
                      Completed
                    </span>
                  )}
                </div>

                {selectedView.completedAt ? (
                  <>
                    <p className="mt-2 text-sm text-zinc-400">
                      Use these only after you have attempted the problem. They control the next review date.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {REVIEW_BUTTONS.map((button) => (
                        <button
                          key={button.outcome}
                          type="button"
                          disabled={busyItemId === selectedView.item.id}
                          onClick={() => void reviewItem(selectedView.item.id, button.outcome)}
                          className={`rounded-2xl border px-3 py-3 text-sm font-medium transition active:scale-95 disabled:opacity-50 ${button.tone}`}
                        >
                          {button.label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">
                    This section stays out of the way until the first completion. Start the practice session first, then grade how it felt.
                  </p>
                )}
              </article>

              <details className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5" open={Boolean(selectedView.completedAt)}>
                <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-100">History & metadata</summary>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Last Done</p>
                    <p className="mt-2 text-sm text-zinc-100">{formatDate(selectedView.completedAt)}</p>
                    <p className="text-xs text-zinc-500">{selectedView.completedAt ? formatRelative(selectedView.completedAt) : "Not completed yet"}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Next Review</p>
                    <p className="mt-2 text-sm text-zinc-100">{selectedView.completedAt ? formatDate(selectedView.item.nextReviewAt) : "Not scheduled"}</p>
                    <p className="text-xs text-zinc-500">
                      {selectedView.completedAt && selectedView.item.nextReviewAt ? formatRelative(selectedView.item.nextReviewAt) : "Review after first completion"}
                    </p>
                  </div>
                </div>

                {selectedView.meta.whyItMatters && (
                  <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Why It Matters</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{selectedView.meta.whyItMatters}</p>
                  </div>
                )}

                {selectedView.meta.sourceRefs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedView.meta.sourceRefs.map((ref) => (
                      <a
                        key={`${selectedView.item.id}-${ref.url}`}
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-zinc-600"
                      >
                        {ref.label}
                      </a>
                    ))}
                  </div>
                )}
              </details>
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
