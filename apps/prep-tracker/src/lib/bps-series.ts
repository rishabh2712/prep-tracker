import configJson from "../../data/programs/uber-bps-series.json";
import {
  FRONTEND_BANK_ENTRY_BY_ID,
  frontendCompletedAt,
  toFrontendBankItem,
  type FrontendBankItem,
  type FrontendTabKey,
} from "@/lib/frontend-bank";
import {
  UBER_DSA_MOCK_DURATION_MINUTES,
  UBER_DSA_MOCK_QUESTIONS,
  type MockInterviewQuestionConfig,
} from "@/lib/mock-interview-dsa";
import type { MockInterviewProgress, MockInterviewStatus, PrepItem } from "@/lib/types";

export type BpsQuestionCategory = "javascript" | "react" | "dsa";

export type BpsRoundScriptStep = {
  key: string;
  label: string;
  minutes: number;
  prompt: string;
};

export type BpsSessionConfig = {
  id: string;
  title: string;
  goal: string;
  roundFocus: string;
  timeboxMinutes: number;
  exitCriteria: string;
  whyThisMatters: string;
  primaryBankId: string;
  supportBankIds: string[];
};

export type BpsExtraQuestionConfig = {
  id: string;
  title: string;
  category: BpsQuestionCategory;
  context: string;
  problemStatement: string;
  requirements: string[];
  exampleMarkdown?: string;
  followUps?: string[];
  hints?: string[];
  referenceSolutionMarkdown?: string;
  relatedBankIds: string[];
};

export type BpsMockSetConfig = {
  id: string;
  title: string;
  description: string;
  questionIds: string[];
};

export type BpsSeriesConfig = {
  programId: string;
  title: string;
  description: string;
  roundScript: BpsRoundScriptStep[];
  extraQuestions?: BpsExtraQuestionConfig[];
  mockSets?: BpsMockSetConfig[];
  sessions: BpsSessionConfig[];
};

export type BpsChecklist = {
  programId: string;
  sessionId: string;
  rubricReviewed: boolean;
  updatedAt: string | null;
};

export type BpsQuestionStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE";

export type BpsTrackedSession = {
  id: string;
  title: string;
  goal: string;
  timeboxMinutes: number;
  primaryCompleted: boolean;
  supportItems: FrontendBankItem[];
  supportCompletedCount: number;
  checklist: BpsChecklist;
  checklistCompleted: boolean;
  completionHint: string;
};

export type BpsQuestionView = {
  id: string;
  title: string;
  category: BpsQuestionCategory;
  sourceKind: "bank" | "curated";
  durationMinutes: number | null;
  status: BpsQuestionStatus | null;
  promptMarkdown: string;
  followUps: string[];
  hints: string[];
  coachOverviewMarkdown: string;
  rubricMarkdown: string;
  referenceMarkdown: string;
  linkedItem: FrontendBankItem | null;
  trackedSession: BpsTrackedSession | null;
};

export type BpsQuestionGroup = {
  category: BpsQuestionCategory;
  label: string;
  questions: BpsQuestionView[];
};

export type BpsMockSetView = {
  id: string;
  title: string;
  description: string;
  questionIds: string[];
  counts: Record<BpsQuestionCategory, number>;
  questionCount: number;
};

export type BpsSeriesSummary = {
  totalSessions: number;
  doneSessions: number;
  inProgressSessions: number;
  primaryCompletedCount: number;
  checklistCompletedCount: number;
  completionPct: number;
};

export type BpsSeriesResponse = {
  programId: string;
  title: string;
  description: string;
  roundScript: BpsRoundScriptStep[];
  summary: BpsSeriesSummary;
  recommendedQuestionId: string | null;
  defaultQuestionId: string | null;
  questionGroups: BpsQuestionGroup[];
  questions: BpsQuestionView[];
  mockSets: BpsMockSetView[];
  mockInterview: MockInterviewResponse;
};

export type MockInterviewQuestionView = {
  id: string;
  title: string;
  slug: string | null;
  leetcodeId: number | null;
  difficulty: string;
  patterns: string[];
  durationMinutes: number;
  promptMarkdown: string;
  followUps: string[];
  hints: string[];
  linkedItem: PrepItem | null;
  progress: MockInterviewProgress | null;
  status: MockInterviewStatus;
  excludedFromRandom: boolean;
};

export type MockInterviewSummary = {
  totalQuestions: number;
  completedCount: number;
  inProgressCount: number;
  untouchedCount: number;
  totalReviews: number;
};

export type MockInterviewResponse = {
  defaultDurationMinutes: number;
  questionPool: MockInterviewQuestionView[];
  summary: MockInterviewSummary;
};

export const BPS_SERIES_CONFIG = configJson as BpsSeriesConfig;

const CATEGORY_LABELS: Record<BpsQuestionCategory, string> = {
  javascript: "JavaScript",
  react: "React",
  dsa: "DSA",
};

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

type MarkdownSection = {
  heading: string | null;
  content: string;
};

type StudyPanels = {
  prompt: string;
  coach: string;
};

type RubricSections = {
  leading: string;
  rubric: string;
  reference: string;
};

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

function splitRubricSections(content: string): RubricSections {
  const normalized = normalizedMarkdown(content);
  if (!normalized) {
    return { leading: "", rubric: "", reference: "" };
  }

  const rubricMatch = /^##\s+(?:Reveal Rubric|Hidden Rubric)\s*$/m.exec(normalized);
  if (!rubricMatch || rubricMatch.index === undefined) {
    return { leading: normalized, rubric: "", reference: "" };
  }

  const leading = normalized.slice(0, rubricMatch.index).trim();
  const rubricBody = normalized.slice(rubricMatch.index + rubricMatch[0].length).trim();
  const referenceMatch = /^###\s+Reference Implementation\s*$/m.exec(rubricBody);

  if (!referenceMatch || referenceMatch.index === undefined) {
    return { leading, rubric: rubricBody, reference: "" };
  }

  return {
    leading,
    rubric: rubricBody.slice(0, referenceMatch.index).trim(),
    reference: rubricBody.slice(referenceMatch.index + referenceMatch[0].length).trim(),
  };
}

function hasLegacyTeachBack(row: Record<string, unknown>): boolean {
  return [
    row.plainEnglishProblem,
    row.bruteForceWhyTooSlow,
    row.keyInvariant,
    row.whyThisDataStructure,
    row.commonBug,
  ].every((value) => typeof value === "string" && value.trim().length > 0);
}

function parseDurationMinutes(timebox: string | null | undefined): number | null {
  if (!timebox) return null;
  const match = timebox.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function categoryFromTab(tab: FrontendTabKey): BpsQuestionCategory | null {
  if (tab === "js-async") return "javascript";
  if (tab === "react-browser" || tab === "frontend-coding") return "react";
  if (tab === "dsa") return "dsa";
  return null;
}

function bankPromptContent(item: FrontendBankItem): Pick<BpsQuestionView, "promptMarkdown" | "coachOverviewMarkdown" | "rubricMarkdown" | "referenceMarkdown"> {
  const canonicalNotes = sanitizedStudyMarkdown(item.item.notesMarkdown);
  const fallbackNotes = sanitizedStudyMarkdown(item.meta.studyGuideMarkdown);
  const source = canonicalNotes || fallbackNotes || normalizedMarkdown(item.item.notesMarkdown) || normalizedMarkdown(item.meta.studyGuideMarkdown);
  const panels = splitStudyPanels(source);
  const rubric = splitRubricSections(panels.coach);

  return {
    promptMarkdown: panels.prompt,
    coachOverviewMarkdown: rubric.leading,
    rubricMarkdown: rubric.rubric,
    referenceMarkdown: rubric.reference,
  };
}

function buildCuratedPrompt(question: BpsExtraQuestionConfig): string {
  const lines = [
    "## Context",
    question.context,
    "",
    "## Problem Statement",
    question.problemStatement,
    "",
    "## Requirements",
    ...question.requirements.map((requirement) => `- ${requirement}`),
  ];

  if (question.exampleMarkdown) {
    lines.push("", question.exampleMarkdown.trim());
  }

  return lines.join("\n");
}

function buildMockInterviewPrompt(question: MockInterviewQuestionConfig): string {
  const lines = [
    "## Problem Statement",
    question.problemStatement,
    "",
    "## Requirements",
    ...question.requirements.map((requirement) => `- ${requirement}`),
  ];

  if (question.constraints?.length) {
    lines.push("", "## Constraints", ...question.constraints.map((constraint) => `- ${constraint}`));
  }

  if (question.exampleMarkdown) {
    lines.push("", question.exampleMarkdown.trim());
  }

  return lines.join("\n");
}

function isLinkedItemSolved(item: PrepItem | null): boolean {
  if (!item) return false;
  return Boolean(item.lastSolvedAt);
}

function emptyChecklist(sessionId: string): BpsChecklist {
  return {
    programId: BPS_SERIES_CONFIG.programId,
    sessionId,
    rubricReviewed: false,
    updatedAt: null,
  };
}

export function checklistFromItem(item: PrepItem, sessionId: string): BpsChecklist {
  const metadata = item.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return emptyChecklist(sessionId);
  }

  const raw = (metadata as Record<string, unknown>).bps;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyChecklist(sessionId);
  }

  const row = raw as Record<string, unknown>;
  const programId =
    typeof row.programId === "string" && row.programId.trim() ? row.programId : BPS_SERIES_CONFIG.programId;
  const storedSessionId = typeof row.sessionId === "string" && row.sessionId.trim() ? row.sessionId : sessionId;

  if (programId !== BPS_SERIES_CONFIG.programId || storedSessionId !== sessionId) {
    return emptyChecklist(sessionId);
  }

  return {
    programId,
    sessionId: storedSessionId,
    rubricReviewed: typeof row.rubricReviewed === "boolean" ? row.rubricReviewed : hasLegacyTeachBack(row),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : null,
  };
}

export function isBpsChecklistComplete(checklist: BpsChecklist): boolean {
  return checklist.rubricReviewed;
}

export function deriveBpsSessionStatus(primaryCompleted: boolean, checklistCompleted: boolean, hasAnyChecklistProgress: boolean): BpsQuestionStatus {
  if (primaryCompleted && checklistCompleted) return "DONE";
  if (primaryCompleted || hasAnyChecklistProgress) return "IN_PROGRESS";
  return "NOT_STARTED";
}

function hasChecklistProgress(checklist: BpsChecklist): boolean {
  return checklist.rubricReviewed;
}

export function bpsCompletionHint(primaryCompleted: boolean, checklistCompleted: boolean): string {
  if (!primaryCompleted && !checklistCompleted) {
    return "Finish the main question, then review the hidden rubric to close the session.";
  }
  if (!primaryCompleted) {
    return "You reviewed the rubric. Finish the main question to count this session as done.";
  }
  if (!checklistCompleted) {
    return "The main question is complete. Review the rubric to lock in the session.";
  }
  return "Session complete. Revisit a support drill or move to the next question.";
}

function completedStatus(item: FrontendBankItem): BpsQuestionStatus {
  return frontendCompletedAt(item.item) ? "DONE" : "NOT_STARTED";
}

export function summarizeBpsSessions(sessions: BpsTrackedSession[]): BpsSeriesSummary {
  const totalSessions = sessions.length;
  const doneSessions = sessions.filter((session) => session.primaryCompleted && session.checklistCompleted).length;
  const inProgressSessions = sessions.filter((session) => session.primaryCompleted && !session.checklistCompleted).length;
  const primaryCompletedCount = sessions.filter((session) => session.primaryCompleted).length;
  const checklistCompletedCount = sessions.filter((session) => session.checklistCompleted).length;
  const completionPct = totalSessions > 0 ? Math.round((doneSessions / totalSessions) * 100) : 0;

  return {
    totalSessions,
    doneSessions,
    inProgressSessions,
    primaryCompletedCount,
    checklistCompletedCount,
    completionPct,
  };
}

export function recommendedBpsSessionId(questions: BpsQuestionView[]): string | null {
  return questions.find((question) => question.trackedSession && question.status !== "DONE")?.id ?? questions[0]?.id ?? null;
}

function trackedSessionsByBankId(bankById: Map<string, FrontendBankItem>) {
  const tracked = new Map<string, BpsTrackedSession & { primaryItem: FrontendBankItem }>();

  for (const session of BPS_SERIES_CONFIG.sessions) {
    const primaryItem = bankById.get(session.primaryBankId);
    if (!primaryItem) {
      const manifestTitle = FRONTEND_BANK_ENTRY_BY_ID.get(session.primaryBankId)?.title ?? session.primaryBankId;
      throw new Error(`BPS config could not resolve primary item ${session.primaryBankId} (${manifestTitle}). Seed the frontend bank before using /bps.`);
    }

    const supportItems = session.supportBankIds.map((bankId) => {
      const item = bankById.get(bankId);
      if (!item) {
        const manifestTitle = FRONTEND_BANK_ENTRY_BY_ID.get(bankId)?.title ?? bankId;
        throw new Error(`BPS config could not resolve support item ${bankId} (${manifestTitle}). Seed the frontend bank before using /bps.`);
      }
      return item;
    });

    const checklist = checklistFromItem(primaryItem.item, session.id);
    const checklistCompleted = isBpsChecklistComplete(checklist);
    const primaryCompleted = Boolean(frontendCompletedAt(primaryItem.item));
    const supportCompletedCount = supportItems.filter((item) => Boolean(frontendCompletedAt(item.item))).length;

    tracked.set(session.primaryBankId, {
      id: session.id,
      title: session.title,
      goal: session.goal,
      timeboxMinutes: session.timeboxMinutes,
      primaryCompleted,
      supportItems,
      supportCompletedCount,
      checklist,
      checklistCompleted,
      completionHint: bpsCompletionHint(primaryCompleted, checklistCompleted),
      primaryItem,
    });
  }

  return tracked;
}

function buildBankQuestions(
  items: FrontendBankItem[],
  trackedByBankId: Map<string, BpsTrackedSession & { primaryItem: FrontendBankItem }>
): BpsQuestionView[] {
  const questions: BpsQuestionView[] = [];

  for (const item of items) {
    if (!item.meta.bankId) continue;
    const category = categoryFromTab(item.meta.frontendTab);
    if (!category) continue;

    const tracked = trackedByBankId.get(item.meta.bankId);
    const promptContent = bankPromptContent(item);
    const primaryCompleted = Boolean(frontendCompletedAt(item.item));
    const status = tracked
      ? deriveBpsSessionStatus(primaryCompleted, tracked.checklistCompleted, hasChecklistProgress(tracked.checklist))
      : completedStatus(item);

    questions.push({
      id: item.meta.bankId,
      title: item.item.title,
      category,
      sourceKind: "bank",
      durationMinutes: tracked?.timeboxMinutes ?? parseDurationMinutes(item.meta.timebox),
      status,
      promptMarkdown: promptContent.promptMarkdown,
      followUps: [],
      hints: [],
      coachOverviewMarkdown: promptContent.coachOverviewMarkdown,
      rubricMarkdown: promptContent.rubricMarkdown,
      referenceMarkdown: promptContent.referenceMarkdown,
      linkedItem: item,
      trackedSession: tracked
        ? {
            id: tracked.id,
            title: tracked.title,
            goal: tracked.goal,
            timeboxMinutes: tracked.timeboxMinutes,
            primaryCompleted: tracked.primaryCompleted,
            supportItems: tracked.supportItems,
            supportCompletedCount: tracked.supportCompletedCount,
            checklist: tracked.checklist,
            checklistCompleted: tracked.checklistCompleted,
            completionHint: tracked.completionHint,
          }
        : null,
    });
  }

  return questions;
}

function buildExtraQuestions(bankById: Map<string, FrontendBankItem>): BpsQuestionView[] {
  return (BPS_SERIES_CONFIG.extraQuestions ?? []).map((question) => ({
    id: question.id,
    title: question.title,
    category: question.category,
    sourceKind: "curated",
    durationMinutes: 45,
    status: null,
    promptMarkdown: buildCuratedPrompt(question),
    followUps: question.followUps ?? [],
    hints: question.hints ?? [],
    coachOverviewMarkdown: "",
    rubricMarkdown: "",
    referenceMarkdown: normalizedMarkdown(question.referenceSolutionMarkdown),
    linkedItem: question.relatedBankIds
      .map((bankId) => bankById.get(bankId))
      .find((item): item is FrontendBankItem => Boolean(item)) ?? null,
    trackedSession: null,
  }));
}

function linkedItemMaps(items: PrepItem[]) {
  const byProblemSlug = new Map<string, PrepItem>();
  const byTitle = new Map<string, PrepItem>();

  for (const item of items) {
    if (item.deletedAt) continue;
    if (item.problemSlug?.trim()) {
      byProblemSlug.set(item.problemSlug.trim().toLowerCase(), item);
    }
    byTitle.set(item.title.trim().toLowerCase(), item);
  }

  return { byProblemSlug, byTitle };
}

function resolveMockInterviewLinkedItem(
  question: MockInterviewQuestionConfig,
  bankById: Map<string, FrontendBankItem>,
  itemByProblemSlug: Map<string, PrepItem>,
  itemByTitle: Map<string, PrepItem>
): PrepItem | null {
  if (question.linkedBankId) {
    const bankItem = bankById.get(question.linkedBankId);
    if (bankItem) return bankItem.item;
  }

  if (question.slug?.trim()) {
    const bySlug = itemByProblemSlug.get(question.slug.trim().toLowerCase());
    if (bySlug) return bySlug;
  }

  return itemByTitle.get(question.title.trim().toLowerCase()) ?? null;
}

function buildMockInterviewQuestionPool(
  items: PrepItem[],
  bankById: Map<string, FrontendBankItem>,
  progressRows: MockInterviewProgress[]
): MockInterviewQuestionView[] {
  const progressById = new Map(progressRows.map((progress) => [progress.questionId, progress]));
  const { byProblemSlug, byTitle } = linkedItemMaps(items);

  return UBER_DSA_MOCK_QUESTIONS.map((question) => {
    const progress = progressById.get(question.id) ?? null;
    const linkedItem = resolveMockInterviewLinkedItem(question, bankById, byProblemSlug, byTitle);
    const excludedFromRandom = isLinkedItemSolved(linkedItem) || progress?.status === "COMPLETED";
    const status = progress?.status ?? "NOT_STARTED";

    return {
      id: question.id,
      title: question.title,
      slug: question.slug ?? null,
      leetcodeId: question.leetcodeId ?? null,
      difficulty: question.difficulty,
      patterns: question.patterns,
      durationMinutes: question.timeboxMinutes,
      promptMarkdown: buildMockInterviewPrompt(question),
      followUps: question.followUps,
      hints: question.hints ?? [],
      linkedItem,
      progress,
      status,
      excludedFromRandom,
    };
  });
}

function summarizeMockInterview(questionPool: MockInterviewQuestionView[]): MockInterviewSummary {
  const completedCount = questionPool.filter((question) => question.status === "COMPLETED").length;
  const inProgressCount = questionPool.filter((question) => question.status === "IN_PROGRESS").length;
  const untouchedCount = questionPool.length - completedCount - inProgressCount;
  const totalReviews = questionPool.reduce((sum, question) => sum + (question.progress?.reviewCount ?? 0), 0);

  return {
    totalQuestions: questionPool.length,
    completedCount,
    inProgressCount,
    untouchedCount,
    totalReviews,
  };
}

function buildMockSets(questionsById: Map<string, BpsQuestionView>): BpsMockSetView[] {
  return (BPS_SERIES_CONFIG.mockSets ?? []).map((set) => {
    const counts: Record<BpsQuestionCategory, number> = {
      javascript: 0,
      react: 0,
      dsa: 0,
    };

    for (const questionId of set.questionIds) {
      const question = questionsById.get(questionId);
      if (question) counts[question.category] += 1;
    }

    return {
      id: set.id,
      title: set.title,
      description: set.description,
      questionIds: set.questionIds.filter((id) => questionsById.has(id)),
      counts,
      questionCount: set.questionIds.filter((id) => questionsById.has(id)).length,
    };
  });
}

function groupQuestions(questions: BpsQuestionView[]): BpsQuestionGroup[] {
  const categoryOrder: BpsQuestionCategory[] = ["javascript", "react", "dsa"];

  return categoryOrder.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    questions: questions.filter((question) => question.category === category),
  }));
}

export function hydrateBpsSeries(items: PrepItem[], mockProgress: MockInterviewProgress[] = []): BpsSeriesResponse {
  const frontendBankItems = items
    .map((item) => toFrontendBankItem(item))
    .filter((item): item is FrontendBankItem => Boolean(item));

  const bankById = new Map<string, FrontendBankItem>();
  for (const view of frontendBankItems) {
    if (view.meta.bankId) {
      bankById.set(view.meta.bankId, view);
    }
  }

  const trackedByBankId = trackedSessionsByBankId(bankById);
  const bankQuestions = buildBankQuestions(frontendBankItems, trackedByBankId);
  const extraQuestions = buildExtraQuestions(bankById);
  const questions = [...bankQuestions, ...extraQuestions];
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const mockSets = buildMockSets(questionsById);
  const trackedSessions = Array.from(trackedByBankId.values());
  const summary = summarizeBpsSessions(trackedSessions);
  const questionGroups = groupQuestions(questions);
  const recommendedQuestionId = recommendedBpsSessionId(questions);
  const questionPool = buildMockInterviewQuestionPool(items, bankById, mockProgress);
  const mockInterview = {
    defaultDurationMinutes: UBER_DSA_MOCK_DURATION_MINUTES,
    questionPool,
    summary: summarizeMockInterview(questionPool),
  };

  return {
    programId: BPS_SERIES_CONFIG.programId,
    title: BPS_SERIES_CONFIG.title,
    description: BPS_SERIES_CONFIG.description,
    roundScript: BPS_SERIES_CONFIG.roundScript,
    summary,
    recommendedQuestionId,
    defaultQuestionId: recommendedQuestionId ?? questions[0]?.id ?? null,
    questionGroups,
    questions,
    mockSets,
    mockInterview,
  };
}
