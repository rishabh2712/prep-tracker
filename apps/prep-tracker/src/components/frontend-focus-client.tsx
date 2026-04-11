"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type {
  FrontendFocusCategoryId,
  FrontendFocusCategoryView,
  FrontendFocusQuestionView,
  FrontendFocusResponse,
} from "@/lib/frontend-focus";
import type { FrontendFocusStatus } from "@/lib/types";
import { formatRelative } from "@/lib/ui";

const TAB_ORDER: FrontendFocusCategoryId[] = ["javascript-async", "dsa", "react-ui"];

const TAB_LABELS: Record<FrontendFocusCategoryId, string> = {
  "javascript-async": "JavaScript & Async",
  dsa: "DSA",
  "react-ui": "React & UI Machine Coding",
};

const STATUS_LABELS: Record<FrontendFocusStatus, string> = {
  NOT_DONE: "Not done",
  DONE: "Done",
  DO_AGAIN: "Do again",
};

const STATUS_TONES: Record<FrontendFocusStatus, string> = {
  NOT_DONE: "border-zinc-700 bg-zinc-900 text-zinc-300",
  DONE: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
  DO_AGAIN: "border-amber-500/40 bg-amber-950/30 text-amber-200",
};

const STATUS_BUTTONS: Array<{ status: FrontendFocusStatus; label: string; tone: string }> = [
  { status: "NOT_DONE", label: "Not done", tone: "border-zinc-700 text-zinc-300 hover:bg-zinc-900" },
  { status: "DONE", label: "Done", tone: "border-emerald-500/40 text-emerald-200 hover:bg-emerald-950/30" },
  { status: "DO_AGAIN", label: "Do again", tone: "border-amber-500/40 text-amber-200 hover:bg-amber-950/30" },
];

async function parseError(response: Response): Promise<string> {
  try {
    const json = await response.json();
    return json.error ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

function normalizeTab(value: string | null): FrontendFocusCategoryId {
  return TAB_ORDER.includes(value as FrontendFocusCategoryId) ? (value as FrontendFocusCategoryId) : "javascript-async";
}

function progressPct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

function QuestionCard({
  question,
  busy,
  onUpdate,
}: {
  question: FrontendFocusQuestionView;
  busy: boolean;
  onUpdate: (status: FrontendFocusStatus) => void;
}) {
  return (
    <details className="group rounded-3xl border border-zinc-800 bg-zinc-950/65 open:border-zinc-700">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_TONES[question.status]}`}>
              {STATUS_LABELS[question.status]}
            </span>
            <span className="text-xs uppercase tracking-[0.22em] text-zinc-500">{question.difficulty}</span>
          </div>
          <div className="text-left">
            <p className="text-base font-semibold text-zinc-100">{question.title}</p>
            {question.progress?.updatedAt ? (
              <p className="mt-1 text-xs text-zinc-500">Updated {formatRelative(question.progress.updatedAt)}</p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">No progress yet</p>
            )}
          </div>
        </div>

        <span className="mt-1 text-xs text-zinc-500 transition group-open:rotate-180">⌄</span>
      </summary>

      <div className="border-t border-zinc-900 px-5 py-5">
        <MarkdownRenderer content={question.contentMarkdown} className="text-sm leading-7 text-zinc-200" />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {STATUS_BUTTONS.map((button) => {
            const active = question.status === button.status;
            return (
              <button
                key={button.status}
                type="button"
                disabled={busy}
                onClick={() => onUpdate(button.status)}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-60",
                  button.tone,
                  active ? "ring-1 ring-offset-0 ring-current" : "",
                ].join(" ")}
              >
                {button.label}
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}

export function FrontendFocusClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = normalizeTab(searchParams.get("tab"));

  const [data, setData] = useState<FrontendFocusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/frontend-focus", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const json = (await response.json()) as FrontendFocusResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load frontend focus");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCategory = useMemo<FrontendFocusCategoryView | null>(() => {
    if (!data) return null;
    return data.categories.find((category) => category.id === tab) ?? data.categories[0] ?? null;
  }, [data, tab]);

  function setTab(nextTab: FrontendFocusCategoryId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function updateQuestion(questionId: string, status: FrontendFocusStatus) {
    setBusyQuestionId(questionId);
    setError(null);

    try {
      const response = await fetch(`/api/frontend-focus/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const json = (await response.json()) as { progress: FrontendFocusQuestionView["progress"] };
      setData((current) => {
        if (!current) return current;
        const categories = current.categories.map((category) => {
          const questions = category.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  progress: json.progress,
                  status,
                }
              : question
          );

          const done = questions.filter((question) => question.status === "DONE").length;
          const doAgain = questions.filter((question) => question.status === "DO_AGAIN").length;
          const notDone = questions.length - done - doAgain;

          return {
            ...category,
            questions,
            summary: {
              total: questions.length,
              done,
              doAgain,
              notDone,
              completionPct: progressPct(done, questions.length),
            },
          };
        });

        const allQuestions = categories.flatMap((category) => category.questions);
        const done = allQuestions.filter((question) => question.status === "DONE").length;
        const doAgain = allQuestions.filter((question) => question.status === "DO_AGAIN").length;
        const notDone = allQuestions.length - done - doAgain;

        return {
          ...current,
          categories,
          summary: {
            total: allQuestions.length,
            done,
            doAgain,
            notDone,
            completionPct: progressPct(done, allQuestions.length),
          },
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update question");
    } finally {
      setBusyQuestionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">
              Frontend reset
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">{data?.title ?? "Uber Frontend Focus Tracker"}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                {data?.description ??
                  "One clean place for JavaScript async, DSA, and React/UI machine-coding reps — with lightweight tracking and no old bank clutter."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Done</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-200">{data?.summary.done ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Do again</p>
              <p className="mt-2 text-2xl font-semibold text-amber-200">{data?.summary.doAgain ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Not done</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{data?.summary.notDone ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap gap-3">
          {TAB_ORDER.map((categoryId) => {
            const category = data?.categories.find((entry) => entry.id === categoryId);
            const active = categoryId === tab;
            return (
              <button
                key={categoryId}
                type="button"
                onClick={() => setTab(categoryId)}
                className={[
                  "rounded-2xl border px-4 py-3 text-left transition",
                  active
                    ? "border-sky-500/40 bg-sky-500/10 text-zinc-50"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/70",
                ].join(" ")}
              >
                <p className="text-sm font-semibold">{TAB_LABELS[categoryId]}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {category?.summary.done ?? 0}/{category?.summary.total ?? 0} done
                </p>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-400">Loading your reset tracker…</div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-6 text-sm text-rose-200">{error}</div>
        ) : activeCategory ? (
          <section className="space-y-5">
            <header className="rounded-3xl border border-zinc-800 bg-zinc-950/65 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">{activeCategory.label}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{activeCategory.description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Total</p>
                    <p className="mt-2 text-xl font-semibold text-zinc-100">{activeCategory.summary.total}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Done</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-200">{activeCategory.summary.done}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Do again</p>
                    <p className="mt-2 text-xl font-semibold text-amber-200">{activeCategory.summary.doAgain}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Complete</p>
                    <p className="mt-2 text-xl font-semibold text-zinc-100">{activeCategory.summary.completionPct}%</p>
                  </div>
                </div>
              </div>
            </header>

            <div className="space-y-4">
              {activeCategory.questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  busy={busyQuestionId === question.id}
                  onUpdate={(status) => void updateQuestion(question.id, status)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
