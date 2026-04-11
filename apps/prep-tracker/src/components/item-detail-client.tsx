"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ReviewForm } from "@/components/review-form";
import type { PrepItem, ReviewLog } from "@/lib/types";
import { formatDate, formatRelative, isDue } from "@/lib/ui";

type ItemDetailClientProps = {
  itemId: string;
};

type ItemResponse = {
  item: PrepItem;
};

type ReviewsResponse = {
  reviews: ReviewLog[];
};

type FieldSpec = {
  label: string;
  value: string | null | undefined;
  href?: string | null;
};

type StudyTab = "prompt" | "coach";

type MarkdownSection = {
  heading: string | null;
  content: string;
};

type StudyPanels = {
  prompt: string;
  coach: string;
};

async function parseError(response: Response): Promise<string> {
  try {
    const json = await response.json();
    return json.error ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

function typeLabel(type: PrepItem["type"]): string {
  return type.replaceAll("_", " ");
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0 && value !== "-";
}

function normalizedMarkdown(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

function stripMarkdownSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.replace(new RegExp(`(^|\\n)## ${escaped}\\n[\\s\\S]*?(?=\\n## |$)`, "g"), "$1").trim();
}

function sanitizedStudyMarkdown(value: string | null | undefined): string {
  const normalized = normalizedMarkdown(value);
  if (!normalized) return "";

  const withoutPracticeBrief = stripMarkdownSection(normalized, "Practice Brief");
  const withoutPersonalNotes = stripMarkdownSection(withoutPracticeBrief, "Personal Notes");
  return withoutPersonalNotes.trim();
}

const COACH_SECTION_HEADINGS = new Set([
  "What You'll Do",
  "Why It Matters",
  "What The Interviewer Is Probing",
  "Interviewer Perspective",
  "Preparation Context",
  "Completion Checklist",
  "Reveal Rubric",
  "Hidden Rubric",
  "Edge Cases / Failure Modes",
  "Good Follow-Ups",
  "Sources",
]);

function splitMarkdownSections(markdown: string): MarkdownSection[] {
  if (!markdown.trim()) return [];

  const matches = Array.from(markdown.matchAll(/^##\s+(.+?)\s*$/gm));
  if (matches.length === 0) {
    return [{ heading: null, content: markdown.trim() }];
  }

  const sections: MarkdownSection[] = [];

  matches.forEach((match, index) => {
    if (match.index === undefined) return;
    const nextMatch = matches[index + 1];
    const start = match.index;
    const end = nextMatch?.index ?? markdown.length;
    const chunk = markdown.slice(start, end).trim();
    if (chunk) {
      sections.push({ heading: match[1]?.trim() ?? null, content: chunk });
    }
  });

  const firstMatch = matches[0];
  if (firstMatch?.index && firstMatch.index > 0) {
    const intro = markdown.slice(0, firstMatch.index).trim();
    if (intro) {
      sections.unshift({ heading: null, content: intro });
    }
  }

  return sections;
}

function splitStudyPanels(markdown: string): StudyPanels {
  const normalized = normalizedMarkdown(markdown);
  if (!normalized) {
    return { prompt: "", coach: "" };
  }

  const explicitCoachHeading = /^##\s+Interviewer Perspective\s*$/m.exec(normalized);
  if (explicitCoachHeading?.index !== undefined) {
    return {
      prompt: normalized.slice(0, explicitCoachHeading.index).trim(),
      coach: normalized.slice(explicitCoachHeading.index).trim(),
    };
  }

  const sections = splitMarkdownSections(normalized);
  if (sections.length === 0) {
    return { prompt: "", coach: "" };
  }

  const promptSections = sections.filter((section) => !section.heading || !COACH_SECTION_HEADINGS.has(section.heading));
  const coachSections = sections.filter((section) => section.heading && COACH_SECTION_HEADINGS.has(section.heading));

  return {
    prompt: promptSections.map((section) => section.content).join("\n\n").trim(),
    coach: coachSections.map((section) => section.content).join("\n\n").trim(),
  };
}

function badgeTone(kind: "type" | "state" | "mastery" | "due" | "deleted"): string {
  switch (kind) {
    case "type":
      return "border-slate-300 bg-slate-100 text-slate-900";
    case "state":
      return "border-slate-300 bg-slate-100 text-slate-900";
    case "mastery":
      return "border-slate-300 bg-slate-100 text-slate-900";
    case "due":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "deleted":
      return "border-rose-300 bg-rose-50 text-rose-900";
  }
}

function Badge({ children, tone }: { children: ReactNode; tone: ReturnType<typeof badgeTone> }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}>{children}</span>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-950/5">
      <header className="mb-5">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

function FieldTiles({ fields }: { fields: FieldSpec[] }) {
  const visible = fields.filter((field) => hasText(field.value));
  if (visible.length === 0) {
    return <p className="text-sm text-slate-500">No structured details yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((field) => (
        <article key={field.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{field.label}</p>
          {field.href ? (
            <a href={field.href} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-medium text-sky-700 hover:underline">
              {field.value}
            </a>
          ) : (
            <p className="mt-2 text-sm font-medium text-slate-900">{field.value}</p>
          )}
        </article>
      ))}
    </div>
  );
}

function FactList({ fields }: { fields: FieldSpec[] }) {
  const visible = fields.filter((field) => hasText(field.value));
  if (visible.length === 0) {
    return <p className="text-sm text-slate-500">No metadata yet.</p>;
  }

  return (
    <dl className="space-y-3">
      {visible.map((field) => (
        <div key={field.label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">{field.label}</dt>
          <dd className="max-w-[60%] text-right text-sm font-medium text-slate-900">
            {field.href ? (
              <a href={field.href} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
                {field.value}
              </a>
            ) : (
              field.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function NotesPanel({ title, value }: { title: string; value: string | null | undefined }) {
  if (!hasText(value)) return null;
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      <MarkdownRenderer content={value} tone="light" className="text-sm leading-6 text-slate-800" />
    </article>
  );
}

export function ItemDetailClient({ itemId }: ItemDetailClientProps) {
  const [item, setItem] = useState<PrepItem | null>(null);
  const [reviews, setReviews] = useState<ReviewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyTab, setStudyTab] = useState<StudyTab>("prompt");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemRes, reviewRes] = await Promise.all([
        fetch(`/api/items/${itemId}`, { cache: "no-store" }),
        fetch(`/api/items/${itemId}/reviews`, { cache: "no-store" }),
      ]);

      if (!itemRes.ok) {
        throw new Error(await parseError(itemRes));
      }
      if (!reviewRes.ok) {
        throw new Error(await parseError(reviewRes));
      }

      const itemJson = (await itemRes.json()) as ItemResponse;
      const reviewJson = (await reviewRes.json()) as ReviewsResponse;
      setItem(itemJson.item);
      setReviews(reviewJson.reviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load item");
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setStudyTab("prompt");
  }, [itemId]);

  async function softDelete() {
    const response = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    await load();
  }

  async function restore() {
    const response = await fetch(`/api/items/${itemId}/restore`, { method: "POST" });
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    await load();
  }

  async function hardDelete(redirectHref: string) {
    const response = await fetch(`/api/items/${itemId}/hard-delete`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(await parseError(response));
    }
    window.location.href = redirectHref;
  }

  async function runAction(action: () => Promise<void>, label: string) {
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? `${label}: ${err.message}` : `${label}: failed`);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading item...</p>;
  }

  if (!item) {
    return <p className="text-sm text-rose-700">Item not found.</p>;
  }

  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const isFrontendSurface = metadata.surface === "uber-frontend";
  const backHref = isFrontendSurface ? "/frontend" : "/";
  const backLabel = isFrontendSurface ? "Back to frontend prep" : "Back to dashboard";

  const isLeetcode = item.type === "LEETCODE";
  const isSystem = item.type === "SYSTEM_DESIGN" || item.type === "LLD";
  const canEditStructure = !item.isShared;
  const dueNow = isDue(item.nextReviewAt);
  const frontendTab = typeof metadata.frontendTab === "string" ? metadata.frontendTab : null;
  const roundTag = typeof metadata.roundTag === "string" ? metadata.roundTag : null;
  const priority = typeof metadata.priority === "string" ? metadata.priority : null;
  const timebox = typeof metadata.timebox === "string" ? metadata.timebox : null;
  const level = typeof metadata.level === "string" ? metadata.level : null;
  const studyGuideMarkdown = typeof metadata.studyGuideMarkdown === "string" ? metadata.studyGuideMarkdown : null;
  const displayNotesMarkdown = sanitizedStudyMarkdown(item.notesMarkdown);
  const fallbackStudyMarkdown = sanitizedStudyMarkdown(studyGuideMarkdown);
  const primaryStudyMarkdown = displayNotesMarkdown || fallbackStudyMarkdown;
  const studyPanels = splitStudyPanels(primaryStudyMarkdown || item.notesMarkdown);
  const hasCoachNotes = hasText(studyPanels.coach);
  const activeStudyTab: StudyTab = hasCoachNotes ? studyTab : "prompt";

  const quickFacts: FieldSpec[] = [
    { label: "Round", value: roundTag },
    { label: "Time box", value: timebox },
    { label: "Level", value: level },
    { label: "Difficulty", value: item.difficulty },
    { label: "Frontend tab", value: frontendTab },
    { label: "Priority", value: priority },
    { label: "Confidence", value: item.confidence },
    { label: "Created", value: formatDate(item.createdAt) },
    { label: "Updated", value: formatDate(item.updatedAt) },
  ];

  const leetcodeFields: FieldSpec[] = [
    { label: "Platform", value: item.platform },
    { label: "Problem slug", value: item.problemSlug },
    { label: "Pattern", value: item.pattern },
    { label: "Outcome", value: item.leetcodeOutcome },
    { label: "Attempts", value: item.attemptCount?.toString() ?? null },
    { label: "Time spent (min)", value: item.timeSpentMinutes?.toString() ?? null },
    { label: "Last attempted", value: formatDate(item.lastAttemptedAt) },
    { label: "Last solved", value: formatDate(item.lastSolvedAt) },
  ];

  const systemOverviewFields: FieldSpec[] = [
    { label: "Topic", value: item.systemTopic },
    { label: "Scale notes", value: item.systemScaleNotes },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-950/5">
        <div className="bg-gradient-to-r from-slate-50 via-white to-sky-50/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <Link href={backHref} className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-700">
                ← {backLabel}
              </Link>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={badgeTone("type")}>{typeLabel(item.type)}</Badge>
                {item.isShared ? <Badge tone="border-slate-300 bg-slate-100 text-slate-900">Shared bank 🔒</Badge> : null}
                <Badge tone={badgeTone("state")}>{item.state}</Badge>
                <Badge tone={badgeTone("mastery")}>Mastery {item.mastery}</Badge>
                <Badge tone={badgeTone("due")}>{dueNow ? "Due now" : "Not due"}</Badge>
                {item.deletedAt ? <Badge tone={badgeTone("deleted")}>Deleted</Badge> : null}
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{item.title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Read the study brief, work the problem externally, then come back here to log the review outcome.</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-slate-50/90 px-4 py-3">
                <SummaryMetric
                  label="Next review"
                  value={item.nextReviewAt ? `${formatDate(item.nextReviewAt)} (${formatRelative(item.nextReviewAt)})` : "Not scheduled"}
                />
                <SummaryMetric
                  label="Last reviewed"
                  value={item.lastReviewedAt ? `${formatDate(item.lastReviewedAt)} (${formatRelative(item.lastReviewedAt)})` : "No reviews yet"}
                />
                <SummaryMetric
                  label="Cadence"
                  value={`${item.reviewIntervalDays} day${item.reviewIntervalDays === 1 ? "" : "s"}`}
                />
                <SummaryMetric
                  label="Activity"
                  value={isLeetcode ? formatDate(item.lastSolvedAt ?? item.lastAttemptedAt) : formatDate(item.updatedAt)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {item.problemLink ? (
                <a
                  href={item.problemLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:border-sky-300"
                >
                  Open Problem
                </a>
              ) : null}
              <a href="#log-review" className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                Jump to Review
              </a>
              {canEditStructure ? (
                <Link
                  href={`/items/${item.id}/edit`}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  Edit
                </Link>
              ) : null}

              {!item.deletedAt ? (
                <button
                  type="button"
                  onClick={() => void runAction(softDelete, "Delete")}
                  className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400"
                >
                  Delete
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void runAction(restore, "Restore")}
                    className="rounded-xl border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700 hover:border-emerald-400"
                  >
                    Restore
                  </button>
                  {!item.isShared ? (
                    <button
                      type="button"
                      onClick={() => void runAction(() => hardDelete(backHref), "Hard delete")}
                      className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400"
                    >
                      Hard delete
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {item.deletedAt ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              This record is soft-deleted. You can restore it or remove it permanently.
            </div>
          ) : null}

        </div>
      </header>

      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_340px]">
        <main className="space-y-6">
          <SectionCard
            title={hasCoachNotes ? "Execution Surface" : hasText(primaryStudyMarkdown) ? "Study Guide" : "Notes"}
            description={
              hasCoachNotes
                ? "Stay in prompt mode for the cold-start rep, then switch to coach notes after your attempt."
                : "Keep the reading flow tight: understand the prompt, then move into your practice loop."
            }
          >
            {hasCoachNotes ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
                  <button
                    type="button"
                    onClick={() => setStudyTab("prompt")}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      activeStudyTab === "prompt" ? "bg-slate-950 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudyTab("coach")}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      activeStudyTab === "coach" ? "bg-slate-950 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Coach Notes
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        activeStudyTab === "coach" ? "bg-white/10 text-slate-200" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      Read after attempt
                    </span>
                  </button>
                </div>

                {activeStudyTab === "prompt" ? (
                  <div className="rounded-3xl bg-slate-50/90 p-5 ring-1 ring-slate-200">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Problem statement</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">Cold-start prompt</h3>
                      </div>
                      <p className="max-w-md text-sm leading-6 text-slate-500">
                        Read this like a HackerRank or CoderPad spec. Stay here for the solve, then switch to coach notes for the debrief.
                      </p>
                    </div>
                    <MarkdownRenderer content={studyPanels.prompt} tone="light" className="text-[0.95rem] leading-7 text-slate-800" />
                  </div>
                ) : (
                  <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Interviewer perspective</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">Use this after the rep</h3>
                      </div>
                      <p className="max-w-md text-sm leading-6 text-slate-500">
                        This tab holds the meta-layer: what Uber is probing, grading rubrics, common bugs, and follow-up talking points.
                      </p>
                    </div>
                    <MarkdownRenderer content={studyPanels.coach} tone="light" className="text-[0.95rem] leading-7 text-slate-800" />
                  </div>
                )}
              </div>
            ) : (
              <MarkdownRenderer content={primaryStudyMarkdown || item.notesMarkdown} tone="light" className="text-[0.95rem] leading-7 text-slate-800" />
            )}
          </SectionCard>

          <div id="log-review">
            <ReviewForm itemId={itemId} onDone={() => void load()} />
          </div>

          {isLeetcode ? (
            <SectionCard title="LeetCode Snapshot" description="Problem metadata, attempts, and your latest solution state.">
              <FieldTiles fields={leetcodeFields} />
              <div className="mt-4">
                <NotesPanel title="Solution Summary" value={item.solutionSummaryMarkdown} />
              </div>
            </SectionCard>
          ) : null}

          {isSystem ? (
            <SectionCard
              title={item.type === "LLD" ? "LLD Workspace" : "System Design Workspace"}
              description="Keep the structured parts of your design prep visible without drowning the page in empty fields."
            >
              <FieldTiles fields={systemOverviewFields} />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <NotesPanel title="Problem Statement" value={item.problemStatement} />
                <NotesPanel title="Functional Requirements" value={item.functionalRequirements} />
                <NotesPanel title="Non-Functional Requirements" value={item.nonFunctionalRequirements} />
                <NotesPanel title="Capacity Estimates" value={item.capacityEstimates} />
                <NotesPanel title="API Contracts" value={item.apiContracts} />
                <NotesPanel title="Data Model" value={item.dataModelNotes} />
                <NotesPanel title="Architecture" value={item.architectureNotes} />
                <NotesPanel title="Component Deep Dives" value={item.componentDeepDives} />
                <NotesPanel title="Scaling Strategy" value={item.scalingStrategy} />
                <NotesPanel title="Consistency Tradeoffs" value={item.consistencyTradeoffs} />
                <NotesPanel title="Caching Strategy" value={item.cachingStrategy} />
                <NotesPanel title="Failure Modes & Recovery" value={item.failureModesRecovery} />
                <NotesPanel title="Observability" value={item.observability} />
                <NotesPanel title="Security & Privacy" value={item.securityPrivacy} />
                <NotesPanel title="Cost Considerations" value={item.costConsiderations} />
                <NotesPanel title="Alternatives & Tradeoffs" value={item.alternativesTradeoffs} />
                <NotesPanel title="What I Missed" value={item.whatIMissed} />
                <NotesPanel title="Follow-up Topics" value={item.followUpTopics} />
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Review History" description="Each review records the outcome, the next scheduled review, and any notes you wrote at the time.">
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-500">No reviews yet.</p>
            ) : (
              <ul className="space-y-3">
                {reviews.map((review) => (
                  <li key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                          {review.outcome}
                        </span>
                        <p className="text-xs text-slate-500">Logged {formatRelative(review.createdAt)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Next review</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(review.nextReviewAt)}</p>
                        <p className="text-xs text-slate-500">{formatRelative(review.nextReviewAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-slate-700">
                      {hasText(review.notesMarkdown) ? (
                        <MarkdownRenderer content={review.notesMarkdown} tone="light" className="text-sm leading-6 text-slate-800" />
                      ) : (
                        <p>No notes added for this review.</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <SectionCard title="Quick Facts" description="Only the study-relevant metadata that helps you frame the session.">
            <FactList fields={quickFacts} />
          </SectionCard>

          {item.links.length > 0 ? (
            <SectionCard title="Links" description="Open the original source material or the canonical problem directly from here.">
              <ul className="space-y-2 text-sm">
                {item.links.map((link) => (
                  <li key={link.id}>
                    <a href={link.url} target="_blank" rel="noreferrer" className="font-medium text-sky-700 hover:underline">
                      {link.label}
                    </a>
                    <p className="mt-1 break-all text-xs text-slate-500">{link.url}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
