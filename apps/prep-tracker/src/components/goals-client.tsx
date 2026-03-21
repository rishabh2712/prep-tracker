"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { GoalRecord } from "@/lib/types";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIsoDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function GoalsClient() {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [name, setName] = useState("Uber Prep");
  const [description, setDescription] = useState("45 day interview preparation sprint");
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [endDate, setEndDate] = useState(plusDaysIsoDate(44));
  const [leetcodeTarget, setLeetcodeTarget] = useState("120");
  const [systemDesignTarget, setSystemDesignTarget] = useState("25");
  const [dailyMinutesTarget, setDailyMinutesTarget] = useState("150");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/goals", { cache: "no-store" });
      const json = (await res.json()) as { goals?: GoalRecord[]; error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Unable to load goals");
      }
      setGoals(json.goals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load goals");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createGoal() {
    if (!name.trim()) {
      setError("Goal name is required");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        startDate,
        endDate,
        leetcodeTarget: Math.max(0, Number(leetcodeTarget) || 0),
        systemDesignTarget: Math.max(0, Number(systemDesignTarget) || 0),
        dailyMinutesTarget: Math.max(15, Number(dailyMinutesTarget) || 120),
        status: "ACTIVE",
      };

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as { goal?: GoalRecord; error?: string };
      if (!res.ok || !json.goal) {
        throw new Error(json.error ?? "Unable to create goal");
      }

      setGoals((prev) => [json.goal!, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create goal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
          <p className="text-sm text-slate-600">Create prep goals by selecting from the master bank.</p>
        </div>
        <Link href="/bank" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
          Open Bank
        </Link>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Create Goal</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goal name" className="rounded-md border px-3 py-2" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="rounded-md border px-3 py-2" />
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Start date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-md border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">End date</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-md border px-3 py-2" />
          </label>
          <input type="number" min={0} value={leetcodeTarget} onChange={(e) => setLeetcodeTarget(e.target.value)} placeholder="LeetCode target" className="rounded-md border px-3 py-2" />
          <input type="number" min={0} value={systemDesignTarget} onChange={(e) => setSystemDesignTarget(e.target.value)} placeholder="System design target" className="rounded-md border px-3 py-2" />
          <input type="number" min={15} value={dailyMinutesTarget} onChange={(e) => setDailyMinutesTarget(e.target.value)} placeholder="Daily minutes target" className="rounded-md border px-3 py-2" />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createGoal()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Creating..." : "Create Goal"}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Goal List</h3>
        {goals.length === 0 ? (
          <p className="text-sm text-slate-500">No goals yet.</p>
        ) : (
          <ul className="space-y-2">
            {goals.map((goal) => (
              <li key={goal.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{goal.name}</p>
                  <p className="text-xs text-slate-500">
                    {goal.startDate} to {goal.endDate} · targets {goal.leetcodeTarget} LC / {goal.systemDesignTarget} SD
                  </p>
                </div>
                <Link href={`/goals/${goal.id}`} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Open Goal
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
