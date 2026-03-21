"use client";

import { useState } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import type { ReviewOutcome } from "@/lib/types";

const REVIEW_OPTIONS: Array<{
  outcome: ReviewOutcome;
  label: string;
  description: string;
  activeTone: string;
  idleTone: string;
}> = [
  {
    outcome: "AGAIN",
    label: "Again",
    description: "Missed it or needed a full reset.",
    activeTone: "border-rose-400 bg-rose-50 text-rose-900 shadow-sm",
    idleTone: "border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50/70",
  },
  {
    outcome: "HARD",
    label: "Hard",
    description: "Got there, but only with real effort.",
    activeTone: "border-amber-400 bg-amber-50 text-amber-900 shadow-sm",
    idleTone: "border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50/70",
  },
  {
    outcome: "GOOD",
    label: "Good",
    description: "Comfortable recall with minor friction.",
    activeTone: "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-sm",
    idleTone: "border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/70",
  },
  {
    outcome: "EASY",
    label: "Easy",
    description: "Automatic recall. Can stretch the interval.",
    activeTone: "border-sky-400 bg-sky-50 text-sky-900 shadow-sm",
    idleTone: "border-sky-200 text-sky-700 hover:border-sky-300 hover:bg-sky-50/70",
  },
];

type ReviewFormProps = {
  itemId: string;
  onDone: () => void;
};

export function ReviewForm({ itemId, onDone }: ReviewFormProps) {
  const [outcome, setOutcome] = useState<ReviewOutcome>("GOOD");
  const [notesMarkdown, setNotesMarkdown] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const response = await fetch(`/api/items/${itemId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notesMarkdown }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to add review");
      }

      setNotesMarkdown("");
      setOutcome("GOOD");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Log Review</h3>
        <p className="mt-1 text-sm text-slate-500">Capture how the attempt felt so the next review date reflects reality.</p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Outcome</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {REVIEW_OPTIONS.map((entry) => {
            const active = outcome === entry.outcome;
            return (
              <button
                key={entry.outcome}
                type="button"
                onClick={() => setOutcome(entry.outcome)}
                aria-pressed={active}
                className={`rounded-2xl border p-4 text-left transition ${
                  active ? entry.activeTone : `bg-white ${entry.idleTone}`
                }`}
              >
                <p className="text-sm font-semibold">{entry.label}</p>
                <p className="mt-1 text-xs leading-5 opacity-90">{entry.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <MarkdownEditor label="Review Notes" value={notesMarkdown} onChange={setNotesMarkdown} minHeight={180} />

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-500">This saves the review and recalculates the next scheduled repetition.</p>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Saving Review..." : "Save Review"}
        </button>
      </div>
    </form>
  );
}
