"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DsaMockInterviewTab } from "@/components/dsa-mock-interview-tab";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ReviewForm } from "@/components/review-form";
import {
  bpsCompletionHint,
  deriveBpsSessionStatus,
  isBpsChecklistComplete,
  type BpsChecklist,
  type BpsMockSetView,
  type BpsQuestionCategory,
  type BpsQuestionStatus,
  type BpsSeriesResponse,
} from "@/lib/bps-series";
import { formatDate, formatRelative } from "@/lib/ui";

type SaveState = "idle" | "saving" | "saved" | "error";

const STATUS_TONES: Record<BpsQuestionStatus, string> = {
  NOT_STARTED: "border-zinc-700 bg-zinc-950/70 text-zinc-300",
  IN_PROGRESS: "border-amber-500/30 bg-amber-950/25 text-amber-100",
  DONE: "border-emerald-500/35 bg-emerald-950/25 text-emerald-100",
};

const STATUS_DOT_TONES: Record<BpsQuestionStatus, string> = {
  NOT_STARTED: "bg-zinc-500",
  IN_PROGRESS: "bg-amber-400",
  DONE: "bg-emerald-400",
};

const CATEGORY_BADGES: Record<BpsQuestionCategory, string> = {
  javascript: "JavaScript",
  react: "React",
  dsa: "DSA",
};

function parseError(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load BPS questions";
}

async function parseResponseError(response: Response): Promise<string> {
  try {
    const json = await response.json();
    return json.error ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

function statusLabel(status: BpsQuestionStatus): string {
  if (status === "DONE") return "Done";
  if (status === "IN_PROGRESS") return "In progress";
  return "Not started";
}

function difficultyTone(value: string | null | undefined): string {
  const raw = (value ?? "").toLowerCase();
  if (raw === "easy") return "text-emerald-300";
  if (raw === "medium") return "text-amber-300";
  if (raw === "hard") return "text-rose-300";
  return "text-zinc-300";
}

export function BpsSeriesClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<BpsSeriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStateByItemId, setSaveStateByItemId] = useState<Record<string, SaveState>>({});
  const [draftsByItemId, setDraftsByItemId] = useState<Record<string, BpsChecklist>>({});
  const [rubricOpen, setRubricOpen] = useState(false);

  const rubricRef = useRef<HTMLElement | null>(null);
  const reviewRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/bps-series", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await parseResponseError(response));
      }
      const json = (await response.json()) as BpsSeriesResponse;
      setData(json);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const requestedQuestionId = (searchParams.get("question") ?? "").trim();
  const activeSetId = (searchParams.get("set") ?? "").trim();
  const mode = (searchParams.get("mode") ?? "questions").trim() === "mock" ? "mock" : "questions";

  const effectiveQuestions = useMemo(() => {
    if (!data) return [];

    return data.questions.map((question) => {
      if (!question.trackedSession || !question.linkedItem) return question;
      const draft = draftsByItemId[question.linkedItem.item.id];
      if (!draft) return question;

      const checklistCompleted = isBpsChecklistComplete(draft);
      return {
        ...question,
        status: deriveBpsSessionStatus(
          Boolean(question.linkedItem.completedAt),
          checklistCompleted,
          draft.rubricReviewed
        ),
        trackedSession: {
          ...question.trackedSession,
          checklist: draft,
          checklistCompleted,
          completionHint: bpsCompletionHint(Boolean(question.linkedItem.completedAt), checklistCompleted),
        },
      };
    });
  }, [data, draftsByItemId]);

  const activeSet = useMemo(() => data?.mockSets.find((set) => set.id === activeSetId) ?? null, [data, activeSetId]);

  const visibleQuestions = useMemo(() => {
    if (!activeSet) return effectiveQuestions;
    const include = new Set(activeSet.questionIds);
    return effectiveQuestions.filter((question) => include.has(question.id));
  }, [activeSet, effectiveQuestions]);

  const groupedQuestions = useMemo(() => {
    const order: BpsQuestionCategory[] = ["javascript", "react", "dsa"];
    return order
      .map((category) => ({
        category,
        label: CATEGORY_BADGES[category],
        questions: visibleQuestions.filter((question) => question.category === category),
      }))
      .filter((group) => group.questions.length > 0);
  }, [visibleQuestions]);

  const selectedQuestionId = useMemo(() => {
    if (!data) return null;
    const valid = visibleQuestions.some((question) => question.id === requestedQuestionId);
    if (valid) return requestedQuestionId;
    if (activeSet?.questionIds.length) {
      return activeSet.questionIds.find((id) => visibleQuestions.some((question) => question.id === id)) ?? visibleQuestions[0]?.id ?? null;
    }
    return data.recommendedQuestionId ?? visibleQuestions[0]?.id ?? null;
  }, [activeSet, data, requestedQuestionId, visibleQuestions]);

  const selectedQuestion = useMemo(
    () => visibleQuestions.find((question) => question.id === selectedQuestionId) ?? null,
    [selectedQuestionId, visibleQuestions]
  );

  const selectedChecklist =
    selectedQuestion?.trackedSession && selectedQuestion.linkedItem
      ? draftsByItemId[selectedQuestion.linkedItem.item.id] ?? selectedQuestion.trackedSession.checklist
      : null;

  const selectedRubricKey = selectedQuestion?.id ?? null;

  useEffect(() => {
    setRubricOpen(false);
  }, [selectedRubricKey]);

  function updateQuery(next: { question?: string | null; set?: string | null; mode?: "questions" | "mock" | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.question === null) params.delete("question");
    else if (typeof next.question === "string") params.set("question", next.question);
    if (next.set === null) params.delete("set");
    else if (typeof next.set === "string") params.set("set", next.set);
    if (next.mode === null) params.delete("mode");
    else if (typeof next.mode === "string") params.set("mode", next.mode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function persistChecklist(itemId: string, checklist: BpsChecklist) {
    setSaveStateByItemId((prev) => ({ ...prev, [itemId]: "saving" }));
    try {
      const response = await fetch(`/api/bps-series/items/${itemId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checklist),
      });

      if (!response.ok) {
        throw new Error(await parseResponseError(response));
      }

      const json = (await response.json()) as { checklist: BpsChecklist };
      setDraftsByItemId((prev) => ({ ...prev, [itemId]: json.checklist }));
      setSaveStateByItemId((prev) => ({ ...prev, [itemId]: "saved" }));
    } catch {
      setSaveStateByItemId((prev) => ({ ...prev, [itemId]: "error" }));
    }
  }

  function toggleRubricReviewed(nextValue: boolean) {
    if (!selectedQuestion?.trackedSession || !selectedChecklist || !selectedQuestion.linkedItem) return;

    const itemId = selectedQuestion.linkedItem.item.id;
    const nextChecklist: BpsChecklist = {
      ...selectedChecklist,
      rubricReviewed: nextValue,
      updatedAt: new Date().toISOString(),
    };

    setDraftsByItemId((prev) => ({ ...prev, [itemId]: nextChecklist }));
    void persistChecklist(itemId, nextChecklist);
  }

  function scrollToRubric() {
    setRubricOpen(true);
    window.setTimeout(() => {
      rubricRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function scrollToReview() {
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectSet(set: BpsMockSetView | null) {
    updateQuery({ set: set?.id ?? null, question: null });
  }

  function selectQuestion(questionId: string) {
    updateQuery({ question: questionId });
  }

  if (loading) {
    return <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-6 text-sm text-zinc-400">Loading BPS questions…</div>;
  }

  if (error || !data || !selectedQuestion) {
    return (
      <div className="rounded-[28px] border border-rose-500/30 bg-rose-950/20 p-6 text-sm text-rose-200">
        {error ?? "Unable to load the BPS questions."}
      </div>
    );
  }

  const selectedSaveState =
    selectedQuestion.linkedItem && selectedQuestion.trackedSession
      ? saveStateByItemId[selectedQuestion.linkedItem.item.id] ?? "idle"
      : "idle";
  const needsRubricFocus = Boolean(
    selectedQuestion.trackedSession &&
      selectedQuestion.linkedItem &&
      selectedQuestion.linkedItem.completedAt &&
      !selectedQuestion.trackedSession.checklistCompleted
  );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[30px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.98)_0%,rgba(9,9,11,0.98)_100%)] p-5 text-zinc-100 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-sky-200/80">
              <span>Uber Phone Screen</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{data.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">{data.description}</p>
          </div>

          <div className="min-w-[16rem] rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-zinc-400">
              <span>Core progress</span>
              <span>{data.summary.doneSessions}/{data.summary.totalSessions}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${data.summary.completionPct}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-zinc-500">Done</p>
                <p className="mt-1 font-semibold text-white">{data.summary.doneSessions}</p>
              </div>
              <div>
                <p className="text-zinc-500">Primary</p>
                <p className="mt-1 font-semibold text-white">{data.summary.primaryCompletedCount}</p>
              </div>
              <div>
                <p className="text-zinc-500">Rubrics</p>
                <p className="mt-1 font-semibold text-white">{data.summary.checklistCompletedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-zinc-800 bg-zinc-900/75 p-2">
        <div className="flex flex-wrap gap-2">
          {([
            { key: "questions", label: "Questions", description: "Browse the full Uber BPS bank" },
            { key: "mock", label: "Mock Interview", description: "Run a 30m random Uber DSA mock" },
          ] as const).map((entry) => {
            const active = mode === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => updateQuery({ mode: entry.key, question: entry.key === "mock" ? null : undefined, set: entry.key === "mock" ? null : undefined })}
                className={`flex-1 rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-sky-500/40 bg-sky-950/30 shadow-[0_12px_32px_rgba(2,132,199,0.12)]"
                    : "border-zinc-800 bg-zinc-950/55 hover:border-zinc-700 hover:bg-zinc-900/90"
                }`}
              >
                <p className="text-sm font-semibold text-zinc-100">{entry.label}</p>
                <p className="mt-1 text-xs text-zinc-400">{entry.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {mode === "mock" ? <DsaMockInterviewTab mockInterview={data.mockInterview} onRefresh={load} /> : null}

      {mode === "questions" ? (
      <>
      <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/75 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Mock sets</p>
            <p className="mt-1 text-sm text-zinc-300">Build practice sets from the full Uber bank.</p>
          </div>
          {activeSet ? (
            <button
              type="button"
              onClick={() => selectSet(null)}
              className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1.5 text-xs font-semibold text-zinc-200"
            >
              Clear set
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-4">
          {data.mockSets.map((set) => {
            const active = activeSet?.id === set.id;
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => selectSet(set)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-sky-500/40 bg-sky-950/30 shadow-[0_12px_32px_rgba(2,132,199,0.12)]"
                    : "border-zinc-800 bg-zinc-950/65 hover:border-zinc-700 hover:bg-zinc-900/90"
                }`}
              >
                <p className="text-sm font-semibold text-zinc-100">{set.title}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-400">{set.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                  <span>{set.questionCount} questions</span>
                  <span>•</span>
                  <span>{set.counts.javascript} JS</span>
                  <span>•</span>
                  <span>{set.counts.react} React</span>
                  <span>•</span>
                  <span>{set.counts.dsa} DSA</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className={`grid gap-4 ${selectedQuestion.linkedItem ? "xl:grid-cols-[300px_minmax(0,1fr)_280px]" : "xl:grid-cols-[300px_minmax(0,1fr)]"}`}>
        <aside className="rounded-[28px] border border-zinc-800 bg-zinc-900/75 p-3 xl:sticky xl:top-4 xl:self-start">
          <div className="mb-3 px-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Questions</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">{visibleQuestions.length} reps</p>
            {activeSet ? <p className="mt-1 text-xs text-zinc-400">{activeSet.title}</p> : null}
          </div>

          <div className="space-y-4 xl:max-h-[calc(100vh-11rem)] xl:overflow-auto">
            {groupedQuestions.map((group) => (
              <div key={group.category}>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{group.label}</p>
                <div className="mt-2 grid gap-2">
                  {group.questions.map((question) => {
                    const active = question.id === selectedQuestion.id;
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => selectQuestion(question.id)}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-sky-500/40 bg-sky-950/30 shadow-[0_12px_32px_rgba(2,132,199,0.12)]"
                            : "border-zinc-800 bg-zinc-950/65 hover:border-zinc-700 hover:bg-zinc-900/90"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 text-sm font-semibold text-zinc-100">{question.title}</p>
                          {question.status ? <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${STATUS_DOT_TONES[question.status]}`} /> : null}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-zinc-700 bg-zinc-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                              {CATEGORY_BADGES[question.category]}
                            </span>
                            {question.status ? (
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_TONES[question.status]}`}>
                                {statusLabel(question.status)}
                              </span>
                            ) : null}
                          </div>
                          {question.durationMinutes ? <span className="text-xs text-zinc-500">{question.durationMinutes}m</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          <article className="rounded-[28px] border border-zinc-800 bg-zinc-900/75 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                  <span>{CATEGORY_BADGES[selectedQuestion.category]}</span>
                  {selectedQuestion.linkedItem ? (
                    <>
                      <span>•</span>
                      <span className={difficultyTone(selectedQuestion.linkedItem.item.difficulty ?? selectedQuestion.linkedItem.meta.difficulty)}>
                        {selectedQuestion.linkedItem.item.difficulty ?? selectedQuestion.linkedItem.meta.difficulty ?? "Unknown"}
                      </span>
                    </>
                  ) : null}
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{selectedQuestion.title}</h2>
                {selectedQuestion.trackedSession ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{selectedQuestion.trackedSession.goal}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                {(selectedQuestion.coachOverviewMarkdown || selectedQuestion.rubricMarkdown || selectedQuestion.followUps.length > 0) ? (
                  <button
                    type="button"
                    onClick={scrollToRubric}
                    className="rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-900"
                  >
                    Reveal rubric
                  </button>
                ) : null}
                {selectedQuestion.linkedItem ? (
                  <button
                    type="button"
                    onClick={scrollToReview}
                    className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20"
                  >
                    Log attempt
                  </button>
                ) : null}
                {selectedQuestion.linkedItem?.item.problemLink ? (
                  <a
                    href={selectedQuestion.linkedItem.item.problemLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                  >
                    Open source
                  </a>
                ) : null}
                {selectedQuestion.linkedItem ? (
                  <Link
                    href={`/items/${selectedQuestion.linkedItem.item.id}`}
                    className="rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                  >
                    Open full record
                  </Link>
                ) : null}
              </div>
            </div>
          </article>

          <article className="rounded-[30px] bg-zinc-900/60 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ring-1 ring-zinc-800/70">
            <div className="rounded-[28px] bg-zinc-950/70 p-5 ring-1 ring-zinc-800/70">
              <MarkdownRenderer content={selectedQuestion.promptMarkdown} className="text-[0.95rem] leading-7 text-zinc-100" />
            </div>
          </article>

          {(selectedQuestion.coachOverviewMarkdown ||
            selectedQuestion.rubricMarkdown ||
            selectedQuestion.referenceMarkdown ||
            selectedQuestion.followUps.length > 0 ||
            selectedQuestion.hints.length > 0 ||
            selectedQuestion.trackedSession) ? (
            <article
              ref={rubricRef}
              className={`rounded-[28px] border p-5 transition ${
                needsRubricFocus ? "border-amber-500/35 bg-amber-950/10 shadow-[0_16px_40px_rgba(245,158,11,0.12)]" : "border-zinc-800 bg-zinc-900/75"
              }`}
            >
              <details open={rubricOpen} onToggle={(event) => setRubricOpen((event.currentTarget as HTMLDetailsElement).open)}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">Reveal follow-ups & rubric</h3>
                    {selectedQuestion.trackedSession ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {selectedQuestion.trackedSession.timeboxMinutes}m rep • hidden until after your attempt
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/75 px-3 py-1 text-xs font-semibold text-zinc-300">
                    {rubricOpen ? "Hide" : "Open after attempt"}
                  </span>
                </summary>

                <div className="mt-5 space-y-5 border-t border-zinc-800 pt-5">
                  {selectedQuestion.followUps.length > 0 ? (
                    <div className="rounded-2xl bg-zinc-950/55 p-4">
                      <h4 className="text-sm font-semibold text-zinc-100">Follow-up questions</h4>
                      <ul className="mt-3 space-y-3 text-sm leading-6 text-zinc-300">
                        {selectedQuestion.followUps.map((followUp) => (
                          <li key={followUp} className="flex gap-3">
                            <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                            <span>{followUp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {selectedQuestion.hints.length > 0 ? (
                    <div className="rounded-2xl bg-zinc-950/55 p-4">
                      <h4 className="text-sm font-semibold text-zinc-100">Hints</h4>
                      <ul className="mt-3 space-y-3 text-sm leading-6 text-zinc-300">
                        {selectedQuestion.hints.map((hint) => (
                          <li key={hint} className="flex gap-3">
                            <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                            <span>{hint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {selectedQuestion.coachOverviewMarkdown ? (
                    <div className="rounded-2xl bg-zinc-950/55 p-4">
                      <MarkdownRenderer content={selectedQuestion.coachOverviewMarkdown} className="text-sm leading-6 text-zinc-200" />
                    </div>
                  ) : null}

                  {selectedQuestion.rubricMarkdown ? (
                    <div className="rounded-2xl bg-zinc-950/55 p-4">
                      <MarkdownRenderer content={selectedQuestion.rubricMarkdown} className="text-sm leading-6 text-zinc-100" />
                    </div>
                  ) : null}

                  {selectedQuestion.referenceMarkdown ? (
                    <details className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/55">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-100">Reference solution</summary>
                      <div className="border-t border-zinc-800 px-4 py-4">
                        <MarkdownRenderer content={selectedQuestion.referenceMarkdown} className="text-sm leading-6 text-zinc-100" />
                      </div>
                    </details>
                  ) : null}

                  {selectedQuestion.trackedSession && selectedChecklist ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <label className="flex items-start gap-3 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={selectedChecklist.rubricReviewed}
                          onChange={(event) => toggleRubricReviewed(event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-emerald-400 focus:ring-emerald-500/30"
                        />
                        <span>
                          I reviewed the rubric and graded my attempt honestly.
                          <span className="mt-1 block text-xs leading-5 text-zinc-500">
                            This saves only for tracked BPS core questions.
                          </span>
                        </span>
                      </label>
                      <p
                        className={`mt-3 text-xs ${
                          selectedSaveState === "error"
                            ? "text-rose-300"
                            : selectedSaveState === "saved"
                              ? "text-emerald-300"
                              : selectedSaveState === "saving"
                                ? "text-sky-300"
                                : "text-zinc-500"
                        }`}
                      >
                        {selectedSaveState === "saving" && "Saving…"}
                        {selectedSaveState === "saved" && "Saved"}
                        {selectedSaveState === "error" && "Save failed"}
                        {selectedSaveState === "idle" && "Mark this once you finish your debrief"}
                      </p>
                    </div>
                  ) : null}
                </div>
              </details>
            </article>
          ) : null}

          {selectedQuestion.linkedItem ? (
            <div ref={reviewRef} className="rounded-[28px] border border-zinc-800 bg-zinc-900/75 p-5">
              <h3 className="text-lg font-semibold text-zinc-100">Log attempt</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Finish the rep, then record the outcome here without leaving the page.
              </p>
              <div className="mt-4">
                <ReviewForm itemId={selectedQuestion.linkedItem.item.id} onDone={() => void load()} />
              </div>
            </div>
          ) : null}

          {selectedQuestion.trackedSession ? (
            <>
              <article className="rounded-[28px] border border-zinc-800 bg-zinc-900/75 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <h3 className="text-lg font-semibold text-zinc-100">{statusLabel(selectedQuestion.status ?? "NOT_STARTED")}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{selectedQuestion.trackedSession.completionHint}</p>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/65 px-3 py-2 text-zinc-300">
                      Primary review:{" "}
                      <span className="font-semibold text-zinc-100">{selectedQuestion.linkedItem?.completedAt ? "Logged" : "Open"}</span>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/65 px-3 py-2 text-zinc-300">
                      Rubric:{" "}
                      <span className="font-semibold text-zinc-100">
                        {selectedQuestion.trackedSession.checklistCompleted ? "Reviewed" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <article
                className={`rounded-[28px] border p-5 transition ${
                  !selectedQuestion.linkedItem?.completedAt ? "border-zinc-800/80 bg-zinc-900/50" : "border-zinc-800 bg-zinc-900/75"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">Optional reinforcement</h3>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {selectedQuestion.trackedSession.supportCompletedCount}/{selectedQuestion.trackedSession.supportItems.length} drills completed
                  </span>
                </div>

                {!selectedQuestion.linkedItem?.completedAt ? (
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/45 px-4 py-3 text-sm text-zinc-400">
                    Do the main question first. Support drills unlock once the core rep is finished.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {selectedQuestion.trackedSession.supportItems.map((item) => (
                      <Link
                        key={item.item.id}
                        href={`/items/${item.item.id}`}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950/65 px-4 py-3 transition hover:border-zinc-700 hover:bg-zinc-900/80"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-100">{item.item.title}</p>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                              item.completedAt ? STATUS_TONES.DONE : STATUS_TONES.NOT_STARTED
                            }`}
                          >
                            {item.completedAt ? "Done" : "Optional"}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            </>
          ) : null}
        </section>

        {selectedQuestion.linkedItem ? (
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <article className="rounded-[28px] border border-zinc-800 bg-zinc-900/75 p-4">
              <h3 className="text-base font-semibold text-zinc-100">{selectedQuestion.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {needsRubricFocus
                  ? "Your solve is logged. Review the rubric, debrief honestly, and close the rep."
                  : selectedQuestion.linkedItem.completedAt
                    ? "This question already has progress. Revisit the rubric or move through a mock set."
                    : "Attempt the question here, then record the result below."}
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Last done</dt>
                  <dd className="text-zinc-200">{formatDate(selectedQuestion.linkedItem.completedAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Next review</dt>
                  <dd className="text-zinc-200">
                    {selectedQuestion.linkedItem.item.nextReviewAt
                      ? `${formatDate(selectedQuestion.linkedItem.item.nextReviewAt)} (${formatRelative(
                          selectedQuestion.linkedItem.item.nextReviewAt
                        )})`
                      : "Not scheduled"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-500">Pattern</dt>
                  <dd className="text-right text-zinc-200">
                    {selectedQuestion.linkedItem.item.pattern ?? selectedQuestion.linkedItem.meta.conceptCluster}
                  </dd>
                </div>
              </dl>
            </article>
          </aside>
        ) : null}
      </div>
      </>
      ) : null}
    </div>
  );
}
