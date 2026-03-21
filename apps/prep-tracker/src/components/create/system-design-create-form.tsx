"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";
import { isValidHttpUrl, parseTags, sanitizeLinks, toIsoFromDateInput, type LinkInput } from "@/components/create/utils";

type SystemKind = "SYSTEM_DESIGN" | "LLD";

type SystemDesignCreateFormProps = {
  kind: SystemKind;
};

const TEMPLATE = `## Requirements\n- Functional:\n- Non-functional:\n\n## Capacity and Constraints\n-\n\n## High-Level Design\n-\n\n## Deep Dive\n-\n\n## Failure Modes\n-\n\n## Tradeoffs\n-\n\n## Interview Summary\n-`;

export function SystemDesignCreateForm({ kind }: SystemDesignCreateFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [scaleNotes, setScaleNotes] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [functionalRequirements, setFunctionalRequirements] = useState("");
  const [nonFunctionalRequirements, setNonFunctionalRequirements] = useState("");
  const [capacityEstimates, setCapacityEstimates] = useState("");
  const [apiContracts, setApiContracts] = useState("");
  const [dataModelNotes, setDataModelNotes] = useState("");
  const [architectureNotes, setArchitectureNotes] = useState("");
  const [componentDeepDives, setComponentDeepDives] = useState("");
  const [scalingStrategy, setScalingStrategy] = useState("");
  const [consistencyTradeoffs, setConsistencyTradeoffs] = useState("");
  const [cachingStrategy, setCachingStrategy] = useState("");
  const [failureModesRecovery, setFailureModesRecovery] = useState("");
  const [observability, setObservability] = useState("");
  const [securityPrivacy, setSecurityPrivacy] = useState("");
  const [costConsiderations, setCostConsiderations] = useState("");
  const [alternativesTradeoffs, setAlternativesTradeoffs] = useState("");
  const [whatIMissed, setWhatIMissed] = useState("");
  const [followUpTopics, setFollowUpTopics] = useState("");

  const [notesMarkdown, setNotesMarkdown] = useState(TEMPLATE);
  const [shouldReviewAgain, setShouldReviewAgain] = useState(true);
  const [reviewIntervalDays, setReviewIntervalDays] = useState("7");
  const [nextReviewAt, setNextReviewAt] = useState("");
  const [tags, setTags] = useState(kind === "LLD" ? "lld, design" : "system-design");
  const [links, setLinks] = useState<LinkInput[]>([{ label: "Reference", url: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [duplicateDeleted, setDuplicateDeleted] = useState(false);
  const [busy, setBusy] = useState(false);

  function updateLink(index: number, patch: Partial<LinkInput>) {
    setLinks((prev) => prev.map((link, idx) => (idx === index ? { ...link, ...patch } : link)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDuplicateId(null);
    setDuplicateDeleted(false);

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
        type: kind,
        notesMarkdown,
        shouldReviewAgain,
        reviewIntervalDays: Math.max(1, Number(reviewIntervalDays) || 7),
        nextReviewAt: shouldReviewAgain ? toIsoFromDateInput(nextReviewAt) : null,
        tags: parseTags(tags),
        links: cleanedLinks,
        systemTopic: topic.trim() || null,
        systemScaleNotes: scaleNotes.trim() || null,
        problemStatement: problemStatement.trim() || null,
        functionalRequirements: functionalRequirements.trim() || null,
        nonFunctionalRequirements: nonFunctionalRequirements.trim() || null,
        capacityEstimates: capacityEstimates.trim() || null,
        apiContracts: apiContracts.trim() || null,
        dataModelNotes: dataModelNotes.trim() || null,
        architectureNotes: architectureNotes.trim() || null,
        componentDeepDives: componentDeepDives.trim() || null,
        scalingStrategy: scalingStrategy.trim() || null,
        consistencyTradeoffs: consistencyTradeoffs.trim() || null,
        cachingStrategy: cachingStrategy.trim() || null,
        failureModesRecovery: failureModesRecovery.trim() || null,
        observability: observability.trim() || null,
        securityPrivacy: securityPrivacy.trim() || null,
        costConsiderations: costConsiderations.trim() || null,
        alternativesTradeoffs: alternativesTradeoffs.trim() || null,
        whatIMissed: whatIMissed.trim() || null,
        followUpTopics: followUpTopics.trim() || null,
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
        throw new Error(json.error ?? "Unable to create design record");
      }

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
      <section className="rounded-xl border border-sky-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">{kind === "LLD" ? "LLD" : "System Design"} Basics</h2>
        <p className="mb-4 text-xs text-slate-500">General context and study tracking.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-md border px-3 py-2" placeholder={kind === "LLD" ? "e.g. Design parking lot" : "e.g. Design URL shortener"} />
          <input value={topic} onChange={(e) => setTopic(e.target.value)} className="rounded-md border px-3 py-2" placeholder="Topic" />
          <input value={scaleNotes} onChange={(e) => setScaleNotes(e.target.value)} className="rounded-md border px-3 py-2" placeholder="Scale notes (QPS, latency, size)" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="rounded-md border px-3 py-2" placeholder="tags" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Design Template</h2>
        <p className="mb-4 text-xs text-slate-500">Interview-structured sections.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <textarea value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Problem statement" />
          <textarea value={functionalRequirements} onChange={(e) => setFunctionalRequirements(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Functional requirements" />
          <textarea value={nonFunctionalRequirements} onChange={(e) => setNonFunctionalRequirements(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Non-functional requirements" />
          <textarea value={capacityEstimates} onChange={(e) => setCapacityEstimates(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Capacity estimates" />
          <textarea value={apiContracts} onChange={(e) => setApiContracts(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="API contracts" />
          <textarea value={dataModelNotes} onChange={(e) => setDataModelNotes(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Data model" />
          <textarea value={architectureNotes} onChange={(e) => setArchitectureNotes(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Architecture" />
          <textarea value={componentDeepDives} onChange={(e) => setComponentDeepDives(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Component deep dives" />
          <textarea value={scalingStrategy} onChange={(e) => setScalingStrategy(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Scaling strategy" />
          <textarea value={consistencyTradeoffs} onChange={(e) => setConsistencyTradeoffs(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Consistency tradeoffs" />
          <textarea value={cachingStrategy} onChange={(e) => setCachingStrategy(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Caching strategy" />
          <textarea value={failureModesRecovery} onChange={(e) => setFailureModesRecovery(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Failure modes and recovery" />
          <textarea value={observability} onChange={(e) => setObservability(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Observability" />
          <textarea value={securityPrivacy} onChange={(e) => setSecurityPrivacy(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Security and privacy" />
          <textarea value={costConsiderations} onChange={(e) => setCostConsiderations(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Cost considerations" />
          <textarea value={alternativesTradeoffs} onChange={(e) => setAlternativesTradeoffs(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Alternatives and tradeoffs" />
          <textarea value={whatIMissed} onChange={(e) => setWhatIMissed(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="What I missed" />
          <textarea value={followUpTopics} onChange={(e) => setFollowUpTopics(e.target.value)} className="min-h-[96px] rounded-md border px-3 py-2 text-sm" placeholder="Follow-up topics" />
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

      <MarkdownEditor label="Primary Notes" value={notesMarkdown} onChange={setNotesMarkdown} minHeight={260} />

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
        <button disabled={busy} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Creating..." : `Create ${kind === "LLD" ? "LLD" : "System Design"} Record`}
        </button>
        <button type="button" onClick={() => router.push("/")} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}
