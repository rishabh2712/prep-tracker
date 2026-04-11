"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { formatDate, formatRelative } from "@/lib/ui";
import type { MockInterviewQuestionView, MockInterviewResponse } from "@/lib/bps-series";
import type { MockInterviewStatus, ReviewOutcome } from "@/lib/types";

type DsaMockInterviewTabProps = {
  mockInterview: MockInterviewResponse;
  onRefresh: () => Promise<void> | void;
};

type MockSessionState = {
  sessionId: string;
  questionId: string;
  startedAt: string;
  endsAt: string;
  status: "running" | "expired" | "completed";
};

type SaveState = "idle" | "saving" | "saved" | "error";

const STORAGE_KEY = "prep-tracker:bps-dsa-mock-session:v1";
const LAST_QUESTION_KEY = "prep-tracker:bps-dsa-mock-last-question:v1";

const STATUS_TONES: Record<MockInterviewStatus, string> = {
  NOT_STARTED: "border-zinc-700 bg-zinc-950/70 text-zinc-300",
  IN_PROGRESS: "border-amber-500/30 bg-amber-950/25 text-amber-100",
  COMPLETED: "border-emerald-500/35 bg-emerald-950/25 text-emerald-100",
};

const OUTCOME_OPTIONS: Array<{ outcome: ReviewOutcome; label: string }> = [
  { outcome: "AGAIN", label: "Again" },
  { outcome: "HARD", label: "Hard" },
  { outcome: "GOOD", label: "Good" },
  { outcome: "EASY", label: "Easy" },
];

function statusLabel(status: MockInterviewStatus): string {
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS") return "In progress";
  return "Not started";
}

function sessionDayKey(value: string) {
  return new Date(value).toDateString();
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function randomQuestionId(questionPool: MockInterviewQuestionView[], excludeId?: string | null) {
  const candidates = questionPool.filter((question) => question.id !== excludeId);
  const source = candidates.length > 0 ? candidates : questionPool;
  const index = Math.floor(Math.random() * source.length);
  return source[index]?.id ?? null;
}

export function DsaMockInterviewTab({ mockInterview, onRefresh }: DsaMockInterviewTabProps) {
  const [session, setSession] = useState<MockSessionState | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [poolOpen, setPoolOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState<MockInterviewStatus>("NOT_STARTED");
  const [outcomeDraft, setOutcomeDraft] = useState<ReviewOutcome>("GOOD");
  const [notesDraft, setNotesDraft] = useState("");
  const [progressSaveState, setProgressSaveState] = useState<SaveState>("idle");
  const [reviewSaveState, setReviewSaveState] = useState<SaveState>("idle");

  const activeQuestion = useMemo(
    () => mockInterview.questionPool.find((question) => question.id === session?.questionId) ?? null,
    [mockInterview.questionPool, session?.questionId]
  );
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);
  const unsolvedQuestionPool = useMemo(
    () => mockInterview.questionPool.filter((question) => !question.excludedFromRandom),
    [mockInterview.questionPool]
  );
  const startableQuestionPool = useMemo(
    () => (unsolvedQuestionPool.length > 0 ? unsolvedQuestionPool : mockInterview.questionPool),
    [mockInterview.questionPool, unsolvedQuestionPool]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const lastQuestion = window.localStorage.getItem(LAST_QUESTION_KEY);
    if (lastQuestion) setLastQuestionId(lastQuestion);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as MockSessionState;
      if (!parsed?.questionId || !parsed?.startedAt || !parsed?.endsAt) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (sessionDayKey(parsed.startedAt) !== sessionDayKey(new Date().toISOString())) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setSession(parsed);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (session.status !== "running") return;

    const interval = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (current >= new Date(session.endsAt).getTime()) {
        setSession((existing) =>
          existing ? { ...existing, status: "expired" } : existing
        );
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!activeQuestion) return;
    setStatusDraft(activeQuestion.status);
    setNotesDraft(activeQuestion.progress?.notesMarkdown ?? "");
    setOutcomeDraft(activeQuestion.progress?.lastOutcome ?? "GOOD");
    setProgressSaveState("idle");
    setReviewSaveState("idle");
  }, [activeQuestion]);

  function startMock() {
    const questionId = randomQuestionId(startableQuestionPool, session?.questionId ?? lastQuestionId);
    if (!questionId) return;
    const startedAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + mockInterview.defaultDurationMinutes * 60 * 1000).toISOString();
    setNowMs(Date.now());
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_QUESTION_KEY, questionId);
    }
    setLastQuestionId(questionId);
    setSession({
      sessionId: crypto.randomUUID(),
      questionId,
      startedAt,
      endsAt,
      status: "running",
    });
  }

  function endMock() {
    setSession((existing) => (existing ? { ...existing, status: existing.status === "expired" ? "expired" : "completed" } : existing));
  }

  function resetMock() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setSession(null);
    setNowMs(Date.now());
  }

  async function saveProgress() {
    if (!activeQuestion) return;
    setProgressSaveState("saving");
    try {
      const response = await fetch(`/api/bps-series/mock/questions/${activeQuestion.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDraft, notesMarkdown: notesDraft }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to save progress");
      await onRefresh();
      setProgressSaveState("saved");
    } catch {
      setProgressSaveState("error");
    }
  }

  async function saveReview() {
    if (!activeQuestion) return;
    setReviewSaveState("saving");
    try {
      const response = await fetch(`/api/bps-series/mock/questions/${activeQuestion.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: outcomeDraft, statusAfter: statusDraft, notesMarkdown: notesDraft }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Unable to save review");
      await onRefresh();
      setReviewSaveState("saved");
    } catch {
      setReviewSaveState("error");
    }
  }

  async function resetQuestion(questionId: string) {
    try {
      await fetch(`/api/bps-series/mock/questions/${questionId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "NOT_STARTED", notesMarkdown: "" }),
      });
      await onRefresh();
    } catch {
      // keep this quiet; the main save surfaces already carry explicit status messaging
    }
  }

  const remainingMs = session ? Math.max(0, new Date(session.endsAt).getTime() - nowMs) : mockInterview.defaultDurationMinutes * 60 * 1000;

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-zinc-800 bg-zinc-900/75 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Mock Interview</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              One random Uber-weighted DSA prompt. Thirty minutes. No selection.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            <span>{mockInterview.summary.completedCount} completed</span>
            <span>{mockInterview.summary.inProgressCount} in progress</span>
            <span>{mockInterview.summary.totalReviews} reviews</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {!session ? (
            <button
              type="button"
              onClick={startMock}
              className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/20"
            >
              Start 30m Mock
            </button>
          ) : session.status === "running" ? (
            <>
              <button
                type="button"
                onClick={endMock}
                className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
              >
                End Mock
              </button>
              <button
                type="button"
                onClick={resetMock}
                className="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
              >
                Clear Session
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startMock}
                className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Start New Mock
              </button>
              <button
                type="button"
                onClick={resetMock}
                className="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
              >
                Reset Session
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setPoolOpen((current) => !current)}
            className="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
          >
            {poolOpen ? "Hide Question Pool" : "View Question Pool"}
          </button>
        </div>

        {unsolvedQuestionPool.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">
            You’ve already solved every prompt in this pool, so the mock now falls back to the full set. Reset any question below if you want a fresher unsolved-only rotation.
          </p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Random mocks now skip anything you already marked completed or solved.
          </p>
        )}
      </section>

      {session && activeQuestion ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            <article className="rounded-[22px] border border-zinc-800 bg-zinc-900/75 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                    <span>{activeQuestion.difficulty}</span>
                    <span>•</span>
                    <span>{activeQuestion.durationMinutes}m</span>
                    <span>•</span>
                    <span>{statusLabel(statusDraft)}</span>
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">{activeQuestion.title}</h3>
                </div>

                {activeQuestion.linkedItem ? (
                  <Link
                    href={`/items/${activeQuestion.linkedItem.id}`}
                    className="text-xs font-medium text-zinc-400 transition hover:text-zinc-200"
                  >
                    Open full record
                  </Link>
                ) : null}
              </div>
            </article>

            <article className="rounded-[26px] bg-zinc-900/50 p-5">
              <div className="bg-zinc-950/40 p-1">
                <MarkdownRenderer content={activeQuestion.promptMarkdown} className="text-[0.95rem] leading-7 text-zinc-100" />
              </div>
            </article>

            {(activeQuestion.followUps.length > 0 || activeQuestion.hints.length > 0) ? (
              <article className="rounded-[22px] border border-zinc-800 bg-zinc-900/75 p-4">
                <details>
                  <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-100">Follow-up questions</summary>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                    {activeQuestion.followUps.map((followUp) => (
                      <li key={followUp} className="flex gap-3">
                        <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                        <span>{followUp}</span>
                      </li>
                    ))}
                  </ul>
                </details>

                {activeQuestion.hints.length > 0 ? (
                  <details className="mt-4 border-t border-zinc-800 pt-4">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-100">Hints</summary>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                      {activeQuestion.hints.map((hint) => (
                        <li key={hint} className="flex gap-3">
                          <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                          <span>{hint}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </article>
            ) : null}

            <article className="rounded-[22px] border border-zinc-800 bg-zinc-900/75 p-4">
              <h4 className="text-base font-semibold text-zinc-100">Completion & review</h4>

              <div className="mt-5 flex flex-wrap gap-2">
                {(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as MockInterviewStatus[]).map((status) => {
                  const active = statusDraft === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusDraft(status)}
                      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${active ? STATUS_TONES[status] : "border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"}`}
                    >
                      {statusLabel(status)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {OUTCOME_OPTIONS.map((entry) => {
                  const active = outcomeDraft === entry.outcome;
                  return (
                    <button
                      key={entry.outcome}
                      type="button"
                      onClick={() => setOutcomeDraft(entry.outcome)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${active ? "border-sky-500/35 bg-sky-950/25 text-sky-100" : "border-zinc-700 bg-zinc-950/70 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900"}`}
                    >
                      {entry.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <label className="text-sm font-semibold text-zinc-200">Notes</label>
                <textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition focus:border-sky-500/40"
                  placeholder="What mattered, what broke, what to remember next time."
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveProgress}
                  className="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                  {progressSaveState === "saving" ? "Saving Progress..." : "Save Progress"}
                </button>
                <button
                  type="button"
                  onClick={saveReview}
                  className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                >
                  {reviewSaveState === "saving" ? "Saving Review..." : "Log Review"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
                <span>
                  Progress: {progressSaveState === "error" ? "Save failed" : progressSaveState === "saved" ? "Saved" : "Local only"}
                </span>
                <span>
                  Review: {reviewSaveState === "error" ? "Save failed" : reviewSaveState === "saved" ? "Saved" : "Not yet logged"}
                </span>
                {activeQuestion.excludedFromRandom && activeQuestion.progress?.status !== "COMPLETED" ? (
                  <span>Solved in tracker • excluded from random rotation</span>
                ) : null}
              </div>
            </article>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-[22px] border border-zinc-800 bg-zinc-900/75 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Timer</p>
              <div className="mt-3 text-5xl font-semibold tracking-tight text-zinc-50">{formatCountdown(remainingMs)}</div>
              <p className="mt-3 text-sm text-zinc-400">
                {session.status === "running"
                  ? `Started ${formatRelative(session.startedAt)} • ends ${formatDate(session.endsAt)}`
                  : session.status === "expired"
                    ? "Time is up. Review your attempt and either end or restart the mock."
                    : "This mock is finished. Start a new one when you are ready."}
              </p>
            </section>

            <section className="rounded-[22px] border border-zinc-800 bg-zinc-900/75 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Progress</p>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="flex items-center justify-between gap-3">
                  <span>Status</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONES[activeQuestion.status]}`}>
                    {statusLabel(activeQuestion.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Reviews</span>
                  <span className="font-semibold text-zinc-100">{activeQuestion.progress?.reviewCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Last outcome</span>
                  <span className="font-semibold text-zinc-100">{activeQuestion.progress?.lastOutcome ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Last reviewed</span>
                  <span className="font-semibold text-zinc-100">
                    {activeQuestion.progress?.lastReviewedAt ? formatRelative(activeQuestion.progress.lastReviewedAt) : "Never"}
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      {poolOpen ? (
        <section className="rounded-[22px] border border-zinc-800 bg-zinc-900/75 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Question Pool</p>
              <p className="mt-1 text-sm text-zinc-300">All prompts with local progress state.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
              <span>{mockInterview.summary.completedCount} completed</span>
              <span>•</span>
              <span>{mockInterview.summary.inProgressCount} in progress</span>
              <span>•</span>
              <span>{mockInterview.summary.untouchedCount} untouched</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {mockInterview.questionPool.map((question) => (
              <article key={question.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{question.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{question.difficulty} • {question.durationMinutes}m</p>
                    {question.excludedFromRandom && question.status !== "COMPLETED" ? (
                      <p className="mt-1 text-[11px] text-zinc-500">Solved in tracker • skipped by random mock</p>
                    ) : null}
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONES[question.status]}`}>
                    {statusLabel(question.status)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
                  <span>Reviews: {question.progress?.reviewCount ?? 0}</span>
                  <span>Last reviewed: {question.progress?.lastReviewedAt ? formatRelative(question.progress.lastReviewedAt) : "Never"}</span>
                </div>
                {question.progress ? (
                  <button
                    type="button"
                    onClick={() => void resetQuestion(question.id)}
                    className="mt-3 text-xs font-medium text-zinc-400 transition hover:text-zinc-200"
                  >
                    Reset mock progress
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
