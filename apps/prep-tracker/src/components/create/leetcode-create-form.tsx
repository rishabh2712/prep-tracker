"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";
import { CONFIDENCE_LEVELS, LEETCODE_OUTCOMES } from "@/lib/types";
import { isValidHttpUrl, parseTags, sanitizeLinks, toIsoFromDateInput, type LinkInput } from "@/components/create/utils";

export function LeetcodeCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [problemLink, setProblemLink] = useState("");
  const [problemSlug, setProblemSlug] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [pattern, setPattern] = useState("");
  const [platform, setPlatform] = useState("LeetCode");
  const [outcome, setOutcome] = useState<(typeof LEETCODE_OUTCOMES)[number]>("TODO");
  const [attemptCount, setAttemptCount] = useState("0");
  const [timeSpent, setTimeSpent] = useState("");
  const [lastAttemptedAt, setLastAttemptedAt] = useState("");
  const [lastSolvedAt, setLastSolvedAt] = useState("");
  const [confidence, setConfidence] = useState<(typeof CONFIDENCE_LEVELS)[number] | "">("");
  const [shouldReviewAgain, setShouldReviewAgain] = useState(true);
  const [reviewIntervalDays, setReviewIntervalDays] = useState("7");
  const [nextReviewAt, setNextReviewAt] = useState("");
  const [tags, setTags] = useState("leetcode");
  const [notesMarkdown, setNotesMarkdown] = useState("");
  const [solutionSummaryMarkdown, setSolutionSummaryMarkdown] = useState("");
  const [links, setLinks] = useState<LinkInput[]>([{ label: "Problem", url: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [duplicateDeleted, setDuplicateDeleted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDuplicateId(null);
    setDuplicateDeleted(false);

    if (!title.trim()) {
      setError("Problem title is required.");
      return;
    }
    if (!problemLink.trim() || !isValidHttpUrl(problemLink)) {
      setError("Valid problem link is required.");
      return;
    }

    const cleanedLinks = sanitizeLinks(links);
    if (cleanedLinks.some((link) => !isValidHttpUrl(link.url))) {
      setError("All reference links must start with http:// or https://");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        type: "LEETCODE",
        notesMarkdown,
        platform: platform.trim() || "LeetCode",
        problemLink: problemLink.trim(),
        problemSlug: problemSlug.trim() || null,
        difficulty,
        pattern: pattern.trim() || null,
        leetcodeOutcome: outcome,
        attemptCount: Number(attemptCount) || 0,
        timeSpentMinutes: timeSpent.trim() ? Number(timeSpent) : null,
        lastAttemptedAt: toIsoFromDateInput(lastAttemptedAt),
        lastSolvedAt: toIsoFromDateInput(lastSolvedAt),
        confidence: confidence || null,
        shouldReviewAgain,
        reviewIntervalDays: Math.max(1, Number(reviewIntervalDays) || 7),
        nextReviewAt: shouldReviewAgain ? toIsoFromDateInput(nextReviewAt) : null,
        solutionSummaryMarkdown: solutionSummaryMarkdown || null,
        tags: parseTags(tags),
        links: cleanedLinks,
      };

      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        if (response.status === 409 && json.existingId) {
          setDuplicateId(json.existingId);
          setDuplicateDeleted(Boolean(json.existingDeleted));
        }
        throw new Error(json.error ?? "Unable to create LeetCode record");
      }

      router.push(`/items/${json.item.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create record");
    } finally {
      setBusy(false);
    }
  }

  function updateLink(index: number, patch: Partial<LinkInput>) {
    setLinks((prev) => prev.map((link, idx) => (idx === index ? { ...link, ...patch } : link)));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-emerald-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">LeetCode Problem</h2>
        <p className="mb-4 text-xs text-slate-500">Problem metadata and solving history.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-md border px-3 py-2" placeholder="Problem title" />
          <input value={problemLink} onChange={(e) => setProblemLink(e.target.value)} className="rounded-md border px-3 py-2" placeholder="https://leetcode.com/problems/..." />
          <input value={problemSlug} onChange={(e) => setProblemSlug(e.target.value)} className="rounded-md border px-3 py-2" placeholder="Problem slug/ID" />
          <input value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded-md border px-3 py-2" placeholder="LeetCode" />
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded-md border px-3 py-2">
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} className="rounded-md border px-3 py-2" placeholder="Pattern (Graph, DP...)" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Attempts and Outcome</h2>
        <p className="mb-4 text-xs text-slate-500">Track when you last solved and if revisit is needed.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value as (typeof LEETCODE_OUTCOMES)[number])} className="rounded-md border px-3 py-2">
            {LEETCODE_OUTCOMES.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
          <input type="number" min={0} value={attemptCount} onChange={(e) => setAttemptCount(e.target.value)} className="rounded-md border px-3 py-2" placeholder="Attempt count" />
          <input type="number" min={0} value={timeSpent} onChange={(e) => setTimeSpent(e.target.value)} className="rounded-md border px-3 py-2" placeholder="Time spent (min)" />
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Last attempted</span>
            <input type="date" value={lastAttemptedAt} onChange={(e) => setLastAttemptedAt(e.target.value)} className="w-full rounded-md border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Last solved</span>
            <input type="date" value={lastSolvedAt} onChange={(e) => setLastSolvedAt(e.target.value)} className="w-full rounded-md border px-3 py-2" />
          </label>
          <select value={confidence} onChange={(e) => setConfidence(e.target.value as (typeof CONFIDENCE_LEVELS)[number] | "")} className="rounded-md border px-3 py-2">
            <option value="">Confidence -</option>
            {CONFIDENCE_LEVELS.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Revisit Plan</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shouldReviewAgain} onChange={(e) => setShouldReviewAgain(e.target.checked)} />
            Should revisit
          </label>
          <input type="number" min={1} value={reviewIntervalDays} onChange={(e) => setReviewIntervalDays(e.target.value)} className="rounded-md border px-3 py-2" placeholder="Interval (days)" />
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Next review</span>
            <input type="date" disabled={!shouldReviewAgain} value={nextReviewAt} onChange={(e) => setNextReviewAt(e.target.value)} className="w-full rounded-md border px-3 py-2" />
          </label>
        </div>
      </section>

      <MarkdownEditor label="Solution Summary" value={solutionSummaryMarkdown} onChange={setSolutionSummaryMarkdown} minHeight={180} />
      <MarkdownEditor label="Personal Notes" value={notesMarkdown} onChange={setNotesMarkdown} minHeight={220} />

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Tags and Links</h2>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className="rounded-md border px-3 py-2 w-full" placeholder="graph, shortest-path, revisit" />
        {links.map((link, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
            <input value={link.label} onChange={(e) => updateLink(index, { label: e.target.value })} className="rounded-md border px-3 py-2" placeholder="Label" />
            <input value={link.url} onChange={(e) => updateLink(index, { url: e.target.value })} className="rounded-md border px-3 py-2" placeholder="https://..." />
            <button type="button" onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== index))} className="rounded-md border px-3 py-2 text-xs">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])} className="rounded-md border px-3 py-2 text-xs">Add Link</button>
      </section>

      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {duplicateId && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Existing record found.{" "}
          <Link href={`/items/${duplicateId}`} className="font-semibold underline">
            Open existing item
          </Link>
          {duplicateDeleted ? " (currently deleted; restore from detail page)." : "."}
        </p>
      )}

      <div className="flex gap-3">
        <button disabled={busy} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Creating..." : "Create LeetCode Record"}
        </button>
        <button type="button" onClick={() => router.push("/")} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}
