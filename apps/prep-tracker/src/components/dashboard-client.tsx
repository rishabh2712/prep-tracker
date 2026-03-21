"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UberDaysTracker } from "@/components/uber-days-tracker";
import type { PrepItem, ProgressSnapshot, TrackerGoals } from "@/lib/types";
import { formatDate, formatRelative, isDue } from "@/lib/ui";

type StatsPayload = {
  totalItems: number;
  totalDue: number;
  dueToday: number;
  solvedLeetcode: number;
  byType: Record<string, number>;
  recentReviews: Array<{ id: string; itemId: string; outcome: string; createdAt: string }>;
  goals: TrackerGoals;
  progress: ProgressSnapshot;
};

type StatsResponse = {
  stats: StatsPayload;
  recentChanges: Array<{ id: string; itemId: string | null; action: string; createdAt: string }>;
};

type TabKey = "ALL" | "LEETCODE" | "SYSTEM_DESIGN" | "LLD" | "UBER_DAYS";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "LEETCODE", label: "LeetCode" },
  { key: "SYSTEM_DESIGN", label: "System Design" },
  { key: "LLD", label: "LLD" },
  { key: "UBER_DAYS", label: "Uber 45-Day Tracker" },
];

function TypeBadge({ type }: { type: PrepItem["type"] }) {
  return (
    <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-700">
      {type.replaceAll("_", " ")}
    </span>
  );
}

function ProgressBar({
  value,
  className = "bg-slate-200",
  barClassName = "bg-emerald-500",
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${className}`}>
      <div className={`h-full rounded-full transition-all ${barClassName}`} style={{ width: `${safe}%` }} />
    </div>
  );
}

function paceBadge(status: ProgressSnapshot["paceStatus"], isDark = false) {
  if (status === "ON_TRACK") {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          isDark ? "bg-emerald-300/20 text-emerald-100" : "bg-emerald-100 text-emerald-700"
        }`}
      >
        On track
      </span>
    );
  }
  if (status === "AT_RISK") {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          isDark ? "bg-rose-300/20 text-rose-100" : "bg-rose-100 text-rose-700"
        }`}
      >
        At risk
      </span>
    );
  }
  if (isDark) {
    return <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-slate-100">No target date</span>;
  }
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">No target date</span>;
}

function formatEta(days: number | null): string {
  if (days === null) return "-";
  if (days === 0) return "Done";
  if (days < 7) return `${days} days`;
  const weeks = (days / 7).toFixed(1);
  return `${weeks} weeks`;
}

function formatTargetDate(dateIso: string | null): string {
  if (!dateIso) return "Set a target date";
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return "Set a target date";
  return parsed.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

async function parseError(response: Response): Promise<string> {
  try {
    const json = await response.json();
    return json.error ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

export function DashboardClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [q, setQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [items, setItems] = useState<PrepItem[]>([]);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [recentChanges, setRecentChanges] = useState<StatsResponse["recentChanges"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [goalLeetcode, setGoalLeetcode] = useState("0");
  const [goalSystem, setGoalSystem] = useState("0");
  const [goalDate, setGoalDate] = useState("");
  const [savingGoals, setSavingGoals] = useState(false);

  const isDaysTab = activeTab === "UBER_DAYS";
  const createHref =
    activeTab === "LEETCODE"
      ? "/items/new/leetcode"
      : activeTab === "SYSTEM_DESIGN"
        ? "/items/new/system-design"
        : activeTab === "LLD"
          ? "/items/new/lld"
          : "/items/new";
  const createLabel =
    activeTab === "LEETCODE"
      ? "Add LeetCode"
      : activeTab === "SYSTEM_DESIGN"
        ? "Add System Design"
        : activeTab === "LLD"
          ? "Add LLD"
          : "Add Record";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (activeTab !== "UBER_DAYS") {
      params.set("type", activeTab === "ALL" ? "ALL" : activeTab);
    }
    params.set("includeDeleted", String(includeDeleted));
    params.set("dueOnly", String(dueOnly));
    return params.toString();
  }, [q, activeTab, includeDeleted, dueOnly]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const statsRes = await fetch(`/api/stats`, { cache: "no-store" });
      if (!statsRes.ok) {
        throw new Error(await parseError(statsRes));
      }

      const statsJson = (await statsRes.json()) as StatsResponse;
      setStats(statsJson.stats);
      setRecentChanges(statsJson.recentChanges);

      if (!isDaysTab) {
        const itemsRes = await fetch(`/api/items?${queryString}`, { cache: "no-store" });
        if (!itemsRes.ok) {
          throw new Error(await parseError(itemsRes));
        }
        const itemsJson = (await itemsRes.json()) as { items: PrepItem[] };
        setItems(itemsJson.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  }, [isDaysTab, queryString]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!stats) return;
    setGoalLeetcode(String(stats.goals.leetcodeTarget));
    setGoalSystem(String(stats.goals.systemDesignTarget));
    setGoalDate(stats.goals.targetDate ? new Date(stats.goals.targetDate).toISOString().slice(0, 10) : "");
  }, [stats]);

  const focusQueue = useMemo(() => {
    return items
      .filter((item) => !item.deletedAt && isDue(item.nextReviewAt))
      .sort((a, b) => {
        const aTime = a.nextReviewAt ? new Date(a.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.nextReviewAt ? new Date(b.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 3);
  }, [items]);

  async function saveGoals() {
    setSavingGoals(true);
    setError(null);
    try {
      const payload = {
        leetcodeTarget: Math.max(0, Number(goalLeetcode) || 0),
        systemDesignTarget: Math.max(0, Number(goalSystem) || 0),
        targetDate: goalDate ? new Date(goalDate).toISOString() : null,
      };

      const response = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save goals");
    } finally {
      setSavingGoals(false);
    }
  }

  async function softDelete(id: string) {
    const response = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(await parseError(response));
    await loadAll();
  }

  async function restore(id: string) {
    const response = await fetch(`/api/items/${id}/restore`, { method: "POST" });
    if (!response.ok) throw new Error(await parseError(response));
    await loadAll();
  }

  async function hardDelete(id: string) {
    const response = await fetch(`/api/items/${id}/hard-delete`, { method: "DELETE" });
    if (!response.ok) throw new Error(await parseError(response));
    await loadAll();
  }

  async function runAction(action: () => Promise<void>, label: string) {
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? `${label}: ${err.message}` : `${label}: failed`);
    }
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[linear-gradient(135deg,#0f172a_0%,#14532d_55%,#0f172a_100%)] p-5 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Uber AI Prep Command Center</p>
            <h1 className="text-2xl font-bold tracking-tight">Interview Tracker</h1>
            <p className="text-sm text-slate-200">
              Focus on completion, avoid duplicate work, and stay on pace by target date.
            </p>
          </div>

          {!isDaysTab && (
            <Link
              href={createHref}
              className="rounded-md border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30"
            >
              {createLabel}
            </Link>
          )}
        </div>

        {stats && (
          <div className="relative z-10 mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/15 bg-white/10 p-3">
              <p className="text-xs text-slate-200">Overall Completion</p>
              <p className="mt-1 text-2xl font-semibold">{stats.progress.overall.completionPct}%</p>
              <ProgressBar
                value={stats.progress.overall.completionPct}
                className="mt-2 bg-white/15"
                barClassName="bg-emerald-300"
              />
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-3">
              <p className="text-xs text-slate-200">Remaining Scope</p>
              <p className="mt-1 text-2xl font-semibold">{stats.progress.overall.remaining}</p>
              <p className="mt-1 text-xs text-slate-200">
                ETA {formatEta(stats.progress.overall.etaDays)} at {stats.progress.overall.velocityPerWeek}/week
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-200">Target</p>
                {paceBadge(stats.progress.paceStatus, true)}
              </div>
              <p className="text-2xl font-semibold">{formatTargetDate(stats.progress.targetDate)}</p>
            </div>
          </div>
        )}
      </header>

      <section className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {stats && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Goal Tracker</h2>
              <p className="text-xs text-slate-500">Set your target and monitor done vs remaining in real time.</p>
            </div>
            {paceBadge(stats.progress.paceStatus)}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">LeetCode Target</span>
              <input
                type="number"
                min={0}
                value={goalLeetcode}
                onChange={(e) => setGoalLeetcode(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">System Design Target</span>
              <input
                type="number"
                min={0}
                value={goalSystem}
                onChange={(e) => setGoalSystem(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Target Date</span>
              <input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={savingGoals}
                onClick={() => void saveGoals()}
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingGoals ? "Saving..." : "Save Goals"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>LeetCode</span>
                <span>{stats.progress.leetcode.done}/{stats.progress.leetcode.target}</span>
              </div>
              <ProgressBar value={stats.progress.leetcode.completionPct} className="bg-emerald-100" barClassName="bg-emerald-500" />
              <p className="mt-2 text-xs text-slate-600">
                Remaining: {stats.progress.leetcode.remaining} · Velocity: {stats.progress.leetcode.velocityPerWeek}/week · ETA: {formatEta(stats.progress.leetcode.etaDays)}
              </p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>System Design</span>
                <span>{stats.progress.systemDesign.done}/{stats.progress.systemDesign.target}</span>
              </div>
              <ProgressBar value={stats.progress.systemDesign.completionPct} className="bg-sky-100" barClassName="bg-sky-500" />
              <p className="mt-2 text-xs text-slate-600">
                Remaining: {stats.progress.systemDesign.remaining} · Velocity: {stats.progress.systemDesign.velocityPerWeek}/week · ETA: {formatEta(stats.progress.systemDesign.etaDays)}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>Overall</span>
                <span>{stats.progress.overall.done}/{stats.progress.overall.target}</span>
              </div>
              <ProgressBar value={stats.progress.overall.completionPct} className="bg-amber-100" barClassName="bg-amber-500" />
              <p className="mt-2 text-xs text-slate-600">
                Remaining: {stats.progress.overall.remaining} · Velocity: {stats.progress.overall.velocityPerWeek}/week · ETA: {formatEta(stats.progress.overall.etaDays)}
              </p>
            </div>
          </div>
        </section>
      )}

      {stats && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Records</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalItems}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Due Reviews</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{stats.totalDue}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Due Today</p>
            <p className="mt-2 text-2xl font-bold text-rose-700">{stats.dueToday}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">LeetCode Solved</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.solvedLeetcode}</p>
          </div>
        </section>
      )}

      {!isDaysTab && focusQueue.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-[linear-gradient(135deg,#fff7ed_0%,#fefce8_100%)] p-4">
          <h3 className="text-sm font-semibold text-amber-900">Focus Queue (Due Next)</h3>
          <p className="mt-1 text-xs text-amber-700">Pick these first to keep your spaced-repetition rhythm intact.</p>
          <ul className="mt-3 space-y-2">
            {focusQueue.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-white/70 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">
                    {item.type.replaceAll("_", " ")} · Due {formatRelative(item.nextReviewAt)}
                  </p>
                </div>
                <Link href={`/items/${item.id}`} className="shrink-0 rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {isDaysTab ? (
        <UberDaysTracker />
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-[2fr_auto_auto]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, tags, notes"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />

              <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={dueOnly}
                  onChange={(e) => setDueOnly(e.target.checked)}
                  className="h-4 w-4"
                />
                Due only
              </label>

              <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                  className="h-4 w-4"
                />
                Include deleted
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Records</h2>
            </header>

            {loading ? (
              <p className="p-4 text-sm text-slate-500">Loading...</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No records found.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {items.map((item) => (
                  <li key={item.id} className="p-4 transition-colors hover:bg-slate-50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <TypeBadge type={item.type} />
                          {item.deletedAt && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                              Deleted
                            </span>
                          )}
                          {isDue(item.nextReviewAt) && !item.deletedAt && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              Due
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/items/${item.id}`}
                          className="block text-base font-semibold text-slate-900 hover:underline"
                        >
                          {item.title}
                        </Link>

                        <p className="text-xs text-slate-500">
                          Next review: {formatDate(item.nextReviewAt)} ({formatRelative(item.nextReviewAt)})
                        </p>

                        {item.type === "LEETCODE" && item.problemLink && (
                          <a
                            href={item.problemLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-xs font-medium text-emerald-700 hover:text-emerald-800"
                          >
                            Problem link
                          </a>
                        )}

                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/items/${item.id}/edit`}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Edit
                        </Link>

                        {!item.deletedAt ? (
                          <button
                            type="button"
                            onClick={() => void runAction(() => softDelete(item.id), "Delete")}
                            className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700"
                          >
                            Delete
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void runAction(() => restore(item.id), "Restore")}
                              className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => void runAction(() => hardDelete(item.id), "Hard delete")}
                              className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700"
                            >
                              Hard delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Type Distribution</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            {stats
              ? Object.entries(stats.byType).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span>{key.replaceAll("_", " ")}</span>
                    <span className="font-semibold">{value}</span>
                  </li>
                ))
              : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent Changes</h3>
          {recentChanges.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-700">
              {recentChanges.slice(0, 10).map((entry) => (
                <li key={entry.id} className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span>{entry.action}</span>
                  <span className="text-xs text-slate-500">{formatRelative(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
