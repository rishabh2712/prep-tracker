"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";
import type { ItemType } from "@/lib/types";
import { isValidHttpUrl, parseTags, sanitizeLinks, toIsoFromDateInput, type LinkInput } from "@/components/create/utils";

const GENERAL_TYPES: ItemType[] = ["BEHAVIORAL", "CS_FUNDAMENTALS", "MOCK_INTERVIEW", "PROJECT", "OTHER"];

export function GeneralCreateForm() {
  const router = useRouter();
  const [type, setType] = useState<ItemType>("BEHAVIORAL");
  const [title, setTitle] = useState("");
  const [notesMarkdown, setNotesMarkdown] = useState("");
  const [shouldReviewAgain, setShouldReviewAgain] = useState(true);
  const [reviewIntervalDays, setReviewIntervalDays] = useState("7");
  const [nextReviewAt, setNextReviewAt] = useState("");
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState<LinkInput[]>([{ label: "Reference", url: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateLink(index: number, patch: Partial<LinkInput>) {
    setLinks((prev) => prev.map((link, idx) => (idx === index ? { ...link, ...patch } : link)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
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
        type,
        notesMarkdown,
        shouldReviewAgain,
        reviewIntervalDays: Math.max(1, Number(reviewIntervalDays) || 7),
        nextReviewAt: shouldReviewAgain ? toIsoFromDateInput(nextReviewAt) : null,
        tags: parseTags(tags),
        links: cleanedLinks,
      };

      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to create record");

      router.push(`/items/${json.item.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create record");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">General Record</h2>
        <select value={type} onChange={(e) => setType(e.target.value as ItemType)} className="rounded-md border px-3 py-2">
          {GENERAL_TYPES.map((entry) => (
            <option key={entry} value={entry}>{entry.replaceAll("_", " ")}</option>
          ))}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-md border px-3 py-2 w-full" placeholder="Title" />
        <input value={tags} onChange={(e) => setTags(e.target.value)} className="rounded-md border px-3 py-2 w-full" placeholder="tags" />
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

      <MarkdownEditor label="Notes" value={notesMarkdown} onChange={setNotesMarkdown} minHeight={220} />

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Reference Links</h2>
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

      <div className="flex gap-3">
        <button disabled={busy} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Creating..." : "Create Record"}
        </button>
        <button type="button" onClick={() => router.push("/")} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}
