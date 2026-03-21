"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DayStatus, UberDayRecord } from "@/lib/types";
import { formatRelative } from "@/lib/ui";

type EditableDay = UberDayRecord & {
  dirty?: boolean;
};

type DaysResponse = {
  days: UberDayRecord[];
};

const STATUS_OPTIONS: DayStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

async function parseError(response: Response): Promise<string> {
  try {
    const json = await response.json();
    return json.error ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

export function UberDaysTracker() {
  const [days, setDays] = useState<EditableDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const completed = days.filter((d) => d.status === "COMPLETED").length;
    const inProgress = days.filter((d) => d.status === "IN_PROGRESS").length;
    const notStarted = days.filter((d) => d.status === "NOT_STARTED").length;
    return { completed, inProgress, notStarted };
  }, [days]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/uber-days", { cache: "no-store" });
      if (!res.ok) throw new Error(await parseError(res));
      const json = (await res.json()) as DaysResponse;
      setDays(json.days);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load day tracker");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateField(day: number, key: keyof UberDayRecord, value: string) {
    setDays((prev) =>
      prev.map((record) =>
        record.day === day
          ? {
              ...record,
              [key]: value,
              dirty: true,
            }
          : record
      )
    );
  }

  async function saveDay(day: EditableDay) {
    setSavingDay(day.day);
    setError(null);

    try {
      const payload = {
        status: day.status,
        coding_score_10: day.coding_score_10,
        design_score_10: day.design_score_10,
        build_done: day.build_done,
        leadership_done: day.leadership_done,
        total_minutes: day.total_minutes,
        mistake_tags: day.mistake_tags,
        reattempt_date: day.reattempt_date,
        notes: day.notes,
      };

      const res = await fetch(`/api/uber-days/${day.day}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await parseError(res));
      }

      setDays((prev) => prev.map((record) => (record.day === day.day ? { ...day, dirty: false } : record)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save day");
    } finally {
      setSavingDay(null);
    }
  }

  if (loading) {
    return <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading 45-day tracker...</p>;
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.completed}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">In Progress</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{summary.inProgress}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Not Started</p>
          <p className="mt-2 text-2xl font-bold text-slate-700">{summary.notStarted}</p>
        </div>
      </section>

      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <section className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[1200px] w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Concept</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Coding</th>
              <th className="px-3 py-2">Design</th>
              <th className="px-3 py-2">Build</th>
              <th className="px-3 py-2">Leadership</th>
              <th className="px-3 py-2">Minutes</th>
              <th className="px-3 py-2">Mistakes</th>
              <th className="px-3 py-2">Reattempt</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Save</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {days.map((day) => (
              <tr key={day.day} className={day.dirty ? "bg-amber-50/50" : ""}>
                <td className="px-3 py-2 font-semibold text-slate-900">{day.day}</td>
                <td className="px-3 py-2 text-slate-700">{day.date}</td>
                <td className="px-3 py-2 text-slate-700">
                  <p className="font-medium text-slate-900">{day.concept}</p>
                  <p className="text-xs text-slate-500">{day.core_q1}</p>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={day.status}
                    onChange={(e) => updateField(day.day, "status", e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    {STATUS_OPTIONS.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={day.coding_score_10}
                    onChange={(e) => updateField(day.day, "coding_score_10", e.target.value)}
                    className="w-16 rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="0-10"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={day.design_score_10}
                    onChange={(e) => updateField(day.day, "design_score_10", e.target.value)}
                    className="w-16 rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="0-10"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={day.build_done}
                    onChange={(e) => updateField(day.day, "build_done", e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">-</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={day.leadership_done}
                    onChange={(e) => updateField(day.day, "leadership_done", e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">-</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={day.total_minutes}
                    onChange={(e) => updateField(day.day, "total_minutes", e.target.value)}
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="mins"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={day.mistake_tags}
                    onChange={(e) => updateField(day.day, "mistake_tags", e.target.value)}
                    className="w-40 rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="edge-case|time-complexity"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={day.reattempt_date}
                    onChange={(e) => updateField(day.day, "reattempt_date", e.target.value)}
                    className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="YYYY-MM-DD"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={day.notes}
                    onChange={(e) => updateField(day.day, "notes", e.target.value)}
                    className="w-56 rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="quick notes"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={savingDay === day.day || !day.dirty}
                    onClick={() => void saveDay(day)}
                    className="rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    {savingDay === day.day ? "Saving" : day.dirty ? "Save" : "Saved"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-slate-500">Records are synced with your existing 45-day CSV tracker.</p>
      <p className="text-xs text-slate-500">Last refreshed {formatRelative(new Date().toISOString())}</p>
    </div>
  );
}
