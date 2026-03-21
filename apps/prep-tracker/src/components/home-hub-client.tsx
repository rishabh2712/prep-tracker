"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GoalRecord } from "@/lib/types";

type StatsPayload = {
  totalItems: number;
  totalDue: number;
  solvedLeetcode: number;
};

export function HomeHubClient() {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [goalsRes, statsRes] = await Promise.all([
          fetch("/api/goals", { cache: "no-store" }),
          fetch("/api/stats", { cache: "no-store" }),
        ]);

        if (!goalsRes.ok || !statsRes.ok) {
          throw new Error("Unable to load dashboard");
        }

        const goalsJson = (await goalsRes.json()) as { goals: GoalRecord[] };
        const statsJson = (await statsRes.json()) as { stats: StatsPayload };

        if (!mounted) return;
        setGoals(goalsJson.goals ?? []);
        setStats(statsJson.stats);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load data");
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-[linear-gradient(120deg,#0f172a_0%,#14532d_55%,#0f172a_100%)] p-6 text-white">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Uber AI Prep</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Preparation Workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Build one master bank, execute goal-specific plans, and run spaced repetition with day-wise prep.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Link href="/bank" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300">
          <h2 className="text-sm font-semibold text-slate-900">Master Bank</h2>
          <p className="mt-1 text-sm text-slate-600">Add and maintain canonical LeetCode and System Design items.</p>
        </Link>

        <Link href="/frontend" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300">
          <h2 className="text-sm font-semibold text-slate-900">Frontend Interview Prep</h2>
          <p className="mt-1 text-sm text-slate-600">Curated Uber frontend concepts, coding prompts, DSA, and design stories with review tracking.</p>
        </Link>

        <Link href="/goals" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300">
          <h2 className="text-sm font-semibold text-slate-900">Goals</h2>
          <p className="mt-1 text-sm text-slate-600">Create interview goals, select items, and track pace to deadline.</p>
        </Link>

        <Link href="/legacy" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300">
          <h2 className="text-sm font-semibold text-slate-900">Legacy Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">Existing tracker APIs still work while new goal workflow runs on SQLite.</p>
        </Link>
      </section>

      {stats && (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Bank Items</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalItems}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Due Reviews</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{stats.totalDue}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">LeetCode Solved</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.solvedLeetcode}</p>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Active Goals</h3>
          <Link href="/goals" className="text-xs font-semibold text-slate-700 hover:underline">
            Manage goals
          </Link>
        </div>

        {goals.length === 0 ? (
          <p className="text-sm text-slate-600">No goals yet. Create your first one from Goals.</p>
        ) : (
          <ul className="space-y-2">
            {goals.slice(0, 6).map((goal) => (
              <li key={goal.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{goal.name}</p>
                  <p className="text-xs text-slate-500">
                    {goal.startDate} to {goal.endDate} · {goal.status}
                  </p>
                </div>
                <Link href={`/goals/${goal.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
