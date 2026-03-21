"use client";

import { addDays } from "date-fns";
import { useMemo, useState } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import {
  CONFIDENCE_LEVELS,
  ITEM_STATES,
  ITEM_TYPES,
  LEETCODE_OUTCOMES,
  MASTERY_LEVELS,
  type ItemType,
  type PrepItem,
} from "@/lib/types";
import { parseCsvList, tagsToCsv } from "@/lib/ui";

type LinkInput = {
  id?: string;
  label: string;
  url: string;
};

export type ItemPayload = {
  title: string;
  type: ItemType;
  notesMarkdown: string;
  state: (typeof ITEM_STATES)[number];
  mastery: (typeof MASTERY_LEVELS)[number];
  shouldReviewAgain: boolean;
  reviewIntervalDays: number;
  nextReviewAt: string | null;
  tags: string[];
  links: LinkInput[];

  platform: string | null;
  problemLink: string | null;
  problemSlug: string | null;
  difficulty: string | null;
  pattern: string | null;
  attemptCount: number | null;
  timeSpentMinutes: number | null;
  confidence: (typeof CONFIDENCE_LEVELS)[number] | null;
  lastAttemptedAt: string | null;
  leetcodeOutcome: (typeof LEETCODE_OUTCOMES)[number] | null;
  lastSolvedAt: string | null;
  solutionSummaryMarkdown: string | null;

  systemTopic: string | null;
  systemScaleNotes: string | null;
  problemStatement: string | null;
  functionalRequirements: string | null;
  nonFunctionalRequirements: string | null;
  capacityEstimates: string | null;
  apiContracts: string | null;
  dataModelNotes: string | null;
  architectureNotes: string | null;
  componentDeepDives: string | null;
  scalingStrategy: string | null;
  consistencyTradeoffs: string | null;
  cachingStrategy: string | null;
  failureModesRecovery: string | null;
  observability: string | null;
  securityPrivacy: string | null;
  costConsiderations: string | null;
  alternativesTradeoffs: string | null;
  whatIMissed: string | null;
  followUpTopics: string | null;

  metadata: Record<string, unknown>;
};

type ItemFormProps = {
  mode: "create" | "edit";
  initial?: PrepItem;
  onSubmit: (payload: ItemPayload) => Promise<void>;
  onCancel?: () => void;
};

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fromDateInputValue(raw: string): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseMetadata(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function sectionTitle(title: string, subtitle: string) {
  return (
    <header className="mb-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </header>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="min-h-[88px] rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-400 focus:ring"
      placeholder={placeholder}
    />
  );
}

export function ItemForm({ mode, initial, onSubmit, onCancel }: ItemFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<ItemType>(initial?.type ?? "SYSTEM_DESIGN");
  const [notesMarkdown, setNotesMarkdown] = useState(initial?.notesMarkdown ?? "");
  const [state, setState] = useState(initial?.state ?? "ACTIVE");
  const [mastery, setMastery] = useState(initial?.mastery ?? "MEDIUM");
  const [shouldReviewAgain, setShouldReviewAgain] = useState(initial?.shouldReviewAgain ?? true);
  const [reviewIntervalDays, setReviewIntervalDays] = useState(initial?.reviewIntervalDays ?? 7);
  const [nextReviewAt, setNextReviewAt] = useState(toDateInputValue(initial?.nextReviewAt));
  const [tags, setTags] = useState(tagsToCsv(initial?.tags ?? []));
  const [links, setLinks] = useState<LinkInput[]>(
    initial?.links?.length ? initial.links : [{ label: "", url: "" }]
  );

  const [platform, setPlatform] = useState(initial?.platform ?? "LeetCode");
  const [problemLink, setProblemLink] = useState(initial?.problemLink ?? "");
  const [problemSlug, setProblemSlug] = useState(initial?.problemSlug ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "");
  const [pattern, setPattern] = useState(initial?.pattern ?? "");
  const [attemptCount, setAttemptCount] = useState(initial?.attemptCount?.toString() ?? "");
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(initial?.timeSpentMinutes?.toString() ?? "");
  const [confidence, setConfidence] = useState<(typeof CONFIDENCE_LEVELS)[number] | "">(
    initial?.confidence ?? ""
  );
  const [lastAttemptedAt, setLastAttemptedAt] = useState(toDateInputValue(initial?.lastAttemptedAt));
  const [leetcodeOutcome, setLeetcodeOutcome] = useState(initial?.leetcodeOutcome ?? "TODO");
  const [lastSolvedAt, setLastSolvedAt] = useState(toDateInputValue(initial?.lastSolvedAt));
  const [solutionSummaryMarkdown, setSolutionSummaryMarkdown] = useState(initial?.solutionSummaryMarkdown ?? "");

  const [systemTopic, setSystemTopic] = useState(initial?.systemTopic ?? "");
  const [systemScaleNotes, setSystemScaleNotes] = useState(initial?.systemScaleNotes ?? "");
  const [problemStatement, setProblemStatement] = useState(initial?.problemStatement ?? "");
  const [functionalRequirements, setFunctionalRequirements] = useState(
    initial?.functionalRequirements ?? ""
  );
  const [nonFunctionalRequirements, setNonFunctionalRequirements] = useState(
    initial?.nonFunctionalRequirements ?? ""
  );
  const [capacityEstimates, setCapacityEstimates] = useState(initial?.capacityEstimates ?? "");
  const [apiContracts, setApiContracts] = useState(initial?.apiContracts ?? "");
  const [dataModelNotes, setDataModelNotes] = useState(initial?.dataModelNotes ?? "");
  const [architectureNotes, setArchitectureNotes] = useState(initial?.architectureNotes ?? "");
  const [componentDeepDives, setComponentDeepDives] = useState(initial?.componentDeepDives ?? "");
  const [scalingStrategy, setScalingStrategy] = useState(initial?.scalingStrategy ?? "");
  const [consistencyTradeoffs, setConsistencyTradeoffs] = useState(
    initial?.consistencyTradeoffs ?? ""
  );
  const [cachingStrategy, setCachingStrategy] = useState(initial?.cachingStrategy ?? "");
  const [failureModesRecovery, setFailureModesRecovery] = useState(
    initial?.failureModesRecovery ?? ""
  );
  const [observability, setObservability] = useState(initial?.observability ?? "");
  const [securityPrivacy, setSecurityPrivacy] = useState(initial?.securityPrivacy ?? "");
  const [costConsiderations, setCostConsiderations] = useState(initial?.costConsiderations ?? "");
  const [alternativesTradeoffs, setAlternativesTradeoffs] = useState(
    initial?.alternativesTradeoffs ?? ""
  );
  const [whatIMissed, setWhatIMissed] = useState(initial?.whatIMissed ?? "");
  const [followUpTopics, setFollowUpTopics] = useState(initial?.followUpTopics ?? "");

  const [metadataJson, setMetadataJson] = useState(JSON.stringify(initial?.metadata ?? {}, null, 2));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleLinks = useMemo(
    () => links.filter((link) => link.label.trim() || link.url.trim()),
    [links]
  );

  const isLeetcode = type === "LEETCODE";
  const isSystem = type === "SYSTEM_DESIGN" || type === "LLD";

  function updateLink(index: number, patch: Partial<LinkInput>) {
    setLinks((prev) => prev.map((link, idx) => (idx === index ? { ...link, ...patch } : link)));
  }

  function insertSystemTemplate() {
    const template = `## Requirements\n- Functional:\n- Non-functional:\n\n## Capacity + Constraints\n-\n\n## High-Level Design\n-\n\n## Deep Dive\n-\n\n## Failure Modes\n-\n\n## Tradeoffs\n-\n\n## 2-min Interview Summary\n-`;

    if (!notesMarkdown.trim()) {
      setNotesMarkdown(template);
      return;
    }

    setNotesMarkdown((prev) => `${prev.trim()}\n\n---\n\n${template}`);
  }

  function autoScheduleNextReview() {
    const date = addDays(new Date(), Math.max(1, Number(reviewIntervalDays) || 1));
    setNextReviewAt(date.toISOString().slice(0, 10));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (isLeetcode && !problemLink.trim()) {
      setError("LeetCode problem link is required.");
      return;
    }

    const cleanedLinks = visibleLinks.filter((link) => link.url.trim() && link.label.trim());
    if (cleanedLinks.some((link) => !/^https?:\/\//i.test(link.url))) {
      setError("All links must start with http:// or https://.");
      return;
    }

    setBusy(true);

    try {
      await onSubmit({
        title: title.trim(),
        type,
        notesMarkdown,
        state,
        mastery,
        shouldReviewAgain,
        reviewIntervalDays: Math.max(1, Number(reviewIntervalDays) || 1),
        nextReviewAt: shouldReviewAgain ? fromDateInputValue(nextReviewAt) : null,
        tags: parseCsvList(tags),
        links: cleanedLinks,

        platform: isLeetcode ? platform.trim() || "LeetCode" : null,
        problemLink: isLeetcode ? problemLink.trim() || null : null,
        problemSlug: isLeetcode ? problemSlug.trim() || null : null,
        difficulty: isLeetcode ? difficulty.trim() || null : null,
        pattern: isLeetcode ? pattern.trim() || null : null,
        attemptCount: isLeetcode && attemptCount.trim() ? Number(attemptCount) : null,
        timeSpentMinutes: isLeetcode && timeSpentMinutes.trim() ? Number(timeSpentMinutes) : null,
        confidence: confidence || null,
        lastAttemptedAt: isLeetcode && lastAttemptedAt ? fromDateInputValue(lastAttemptedAt) : null,
        leetcodeOutcome: isLeetcode ? leetcodeOutcome : null,
        lastSolvedAt: isLeetcode && lastSolvedAt ? fromDateInputValue(lastSolvedAt) : null,
        solutionSummaryMarkdown: isLeetcode ? solutionSummaryMarkdown || null : null,

        systemTopic: isSystem ? systemTopic.trim() || null : null,
        systemScaleNotes: isSystem ? systemScaleNotes.trim() || null : null,
        problemStatement: isSystem ? problemStatement.trim() || null : null,
        functionalRequirements: isSystem ? functionalRequirements.trim() || null : null,
        nonFunctionalRequirements: isSystem ? nonFunctionalRequirements.trim() || null : null,
        capacityEstimates: isSystem ? capacityEstimates.trim() || null : null,
        apiContracts: isSystem ? apiContracts.trim() || null : null,
        dataModelNotes: isSystem ? dataModelNotes.trim() || null : null,
        architectureNotes: isSystem ? architectureNotes.trim() || null : null,
        componentDeepDives: isSystem ? componentDeepDives.trim() || null : null,
        scalingStrategy: isSystem ? scalingStrategy.trim() || null : null,
        consistencyTradeoffs: isSystem ? consistencyTradeoffs.trim() || null : null,
        cachingStrategy: isSystem ? cachingStrategy.trim() || null : null,
        failureModesRecovery: isSystem ? failureModesRecovery.trim() || null : null,
        observability: isSystem ? observability.trim() || null : null,
        securityPrivacy: isSystem ? securityPrivacy.trim() || null : null,
        costConsiderations: isSystem ? costConsiderations.trim() || null : null,
        alternativesTradeoffs: isSystem ? alternativesTradeoffs.trim() || null : null,
        whatIMissed: isSystem ? whatIMissed.trim() || null : null,
        followUpTopics: isSystem ? followUpTopics.trim() || null : null,

        metadata: parseMetadata(metadataJson),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        {sectionTitle("Core", "Basic metadata and module selection")}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
              placeholder={isLeetcode ? "e.g. Cheapest Flights Within K Stops" : "e.g. Design URL shortener"}
            />
          </Field>

          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
            >
              {ITEM_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>

          <Field label="State">
            <select
              value={state}
              onChange={(e) => setState(e.target.value as typeof state)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
            >
              {ITEM_STATES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Mastery">
            <select
              value={mastery}
              onChange={(e) => setMastery(e.target.value as typeof mastery)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
            >
              {MASTERY_LEVELS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tags (comma separated)">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
              placeholder="graph, dijkstra, retry"
            />
          </Field>

          <Field label="Confidence">
            <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as (typeof CONFIDENCE_LEVELS)[number] | "")}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
            >
              <option value="">-</option>
              {CONFIDENCE_LEVELS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        {sectionTitle("Review Plan", "Track revisit cycles and spaced practice")}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Review Interval (days)">
            <input
              type="number"
              min={1}
              max={120}
              value={reviewIntervalDays}
              onChange={(e) => setReviewIntervalDays(Number(e.target.value))}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
            />
          </Field>

          <Field label="Next Review Date">
            <div className="flex gap-2">
              <input
                type="date"
                value={nextReviewAt}
                onChange={(e) => setNextReviewAt(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
                disabled={!shouldReviewAgain}
              />
              <button
                type="button"
                onClick={autoScheduleNextReview}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Auto
              </button>
            </div>
          </Field>

          <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={shouldReviewAgain}
              onChange={(e) => setShouldReviewAgain(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="font-medium text-slate-700">Should revisit this topic/problem</span>
          </label>
        </div>
      </section>

      {isLeetcode && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          {sectionTitle("LeetCode Module", "Problem tracking, solve history, and revisit readiness")}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Problem Link *">
              <input
                value={problemLink}
                onChange={(e) => setProblemLink(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
                placeholder="https://leetcode.com/problems/..."
              />
            </Field>

            <Field label="Platform">
              <input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
                placeholder="LeetCode"
              />
            </Field>

            <Field label="Problem ID / Slug">
              <input
                value={problemSlug}
                onChange={(e) => setProblemSlug(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
                placeholder="cheapest-flights-within-k-stops"
              />
            </Field>

            <Field label="Difficulty">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
              >
                <option value="">-</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </Field>

            <Field label="Pattern">
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
                placeholder="Graph / Dijkstra / DP"
              />
            </Field>

            <Field label="Outcome">
              <select
                value={leetcodeOutcome}
                onChange={(e) => setLeetcodeOutcome(e.target.value as typeof leetcodeOutcome)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
              >
                {LEETCODE_OUTCOMES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Attempt Count">
              <input
                type="number"
                min={0}
                value={attemptCount}
                onChange={(e) => setAttemptCount(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
                placeholder="e.g. 3"
              />
            </Field>

            <Field label="Time Spent (minutes)">
              <input
                type="number"
                min={0}
                value={timeSpentMinutes}
                onChange={(e) => setTimeSpentMinutes(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
                placeholder="e.g. 45"
              />
            </Field>

            <Field label="Last Attempted">
              <input
                type="date"
                value={lastAttemptedAt}
                onChange={(e) => setLastAttemptedAt(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
              />
            </Field>

            <Field label="Last Solved">
              <input
                type="date"
                value={lastSolvedAt}
                onChange={(e) => setLastSolvedAt(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
              />
            </Field>
          </div>

          <div className="mt-4">
            <MarkdownEditor
              label="Solution Summary"
              value={solutionSummaryMarkdown}
              onChange={setSolutionSummaryMarkdown}
              minHeight={180}
            />
          </div>
        </section>
      )}

      {isSystem && (
        <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {sectionTitle(
                type === "LLD" ? "LLD Module" : "System Design Module",
                "General + deep-dive template for interview-ready design notes"
              )}
            </div>
            <button
              type="button"
              onClick={insertSystemTemplate}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              Insert Notes Template
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Topic">
              <input
                value={systemTopic}
                onChange={(e) => setSystemTopic(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
                placeholder={
                  type === "LLD"
                    ? "e.g. Design parking lot"
                    : "e.g. Design retrieval-augmented Q&A"
                }
              />
            </Field>
            <Field label="Scale Notes">
              <input
                value={systemScaleNotes}
                onChange={(e) => setSystemScaleNotes(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring"
                placeholder="qps, latency target, storage growth"
              />
            </Field>
            <Field label="Problem Statement">
              <TextArea
                value={problemStatement}
                onChange={setProblemStatement}
                placeholder="What system are you designing and why?"
              />
            </Field>
            <Field label="Functional Requirements">
              <TextArea
                value={functionalRequirements}
                onChange={setFunctionalRequirements}
                placeholder="Core features and user flows"
              />
            </Field>
            <Field label="Non-Functional Requirements">
              <TextArea
                value={nonFunctionalRequirements}
                onChange={setNonFunctionalRequirements}
                placeholder="Latency, availability, durability, consistency"
              />
            </Field>
            <Field label="Capacity Estimates">
              <TextArea
                value={capacityEstimates}
                onChange={setCapacityEstimates}
                placeholder="Read/write QPS, storage/day, bandwidth"
              />
            </Field>
            <Field label="API Contracts">
              <TextArea
                value={apiContracts}
                onChange={setApiContracts}
                placeholder="Important APIs, request/response shape"
              />
            </Field>
            <Field label="Data Model">
              <TextArea
                value={dataModelNotes}
                onChange={setDataModelNotes}
                placeholder="Entities, indexes, partition keys"
              />
            </Field>
            <Field label="Architecture">
              <TextArea
                value={architectureNotes}
                onChange={setArchitectureNotes}
                placeholder="Components and request path"
              />
            </Field>
            <Field label="Component Deep Dives">
              <TextArea
                value={componentDeepDives}
                onChange={setComponentDeepDives}
                placeholder="DB, queue, cache, ranking service..."
              />
            </Field>
            <Field label="Scaling Strategy">
              <TextArea
                value={scalingStrategy}
                onChange={setScalingStrategy}
                placeholder="Horizontal scale, partitioning, async paths"
              />
            </Field>
            <Field label="Consistency Tradeoffs">
              <TextArea
                value={consistencyTradeoffs}
                onChange={setConsistencyTradeoffs}
                placeholder="Strong vs eventual, read/write behavior"
              />
            </Field>
            <Field label="Caching Strategy">
              <TextArea
                value={cachingStrategy}
                onChange={setCachingStrategy}
                placeholder="Cache layers, TTL, invalidation"
              />
            </Field>
            <Field label="Failure Modes & Recovery">
              <TextArea
                value={failureModesRecovery}
                onChange={setFailureModesRecovery}
                placeholder="Single points of failure, retries, fallback"
              />
            </Field>
            <Field label="Observability">
              <TextArea
                value={observability}
                onChange={setObservability}
                placeholder="SLOs, metrics, logs, traces, alerts"
              />
            </Field>
            <Field label="Security & Privacy">
              <TextArea
                value={securityPrivacy}
                onChange={setSecurityPrivacy}
                placeholder="Authz, encryption, PII, audit"
              />
            </Field>
            <Field label="Cost Considerations">
              <TextArea
                value={costConsiderations}
                onChange={setCostConsiderations}
                placeholder="Major cost drivers and mitigation"
              />
            </Field>
            <Field label="Alternatives & Tradeoffs">
              <TextArea
                value={alternativesTradeoffs}
                onChange={setAlternativesTradeoffs}
                placeholder="What options you considered and why"
              />
            </Field>
            <Field label="What I Missed">
              <TextArea
                value={whatIMissed}
                onChange={setWhatIMissed}
                placeholder="Blind spots noticed during mock/interview"
              />
            </Field>
            <Field label="Follow-up Topics">
              <TextArea
                value={followUpTopics}
                onChange={setFollowUpTopics}
                placeholder="What to revise next"
              />
            </Field>
          </div>
        </section>
      )}

      <MarkdownEditor label="Personal Notes" value={notesMarkdown} onChange={setNotesMarkdown} />

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        {sectionTitle("Reference Links", "Attach docs, discussions, and solution references")}
        <button
          type="button"
          onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white"
        >
          Add Link
        </button>

        <div className="space-y-3">
          {links.map((link, index) => (
            <div key={`${link.id ?? "new"}-${index}`} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
              <input
                value={link.label}
                onChange={(e) => updateLink(index, { label: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Link label"
              />
              <input
                value={link.url}
                onChange={(e) => updateLink(index, { url: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== index))}
                className="rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Advanced Metadata (JSON)</summary>
          <textarea
            value={metadataJson}
            onChange={(e) => setMetadataJson(e.target.value)}
            className="mt-3 min-h-[120px] w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            placeholder='{"source": "uber prep", "priority": 2}'
          />
        </details>
      </section>

      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : mode === "create" ? "Create Record" : "Save Changes"}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
