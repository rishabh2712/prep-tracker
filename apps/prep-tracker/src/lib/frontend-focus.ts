import frontendFocusJson from "../../data/programs/uber-frontend-focus.json";
import type { FrontendFocusProgress, FrontendFocusStatus } from "@/lib/types";

export type FrontendFocusCategoryId = "javascript-async" | "dsa" | "react-ui";

export type FrontendFocusQuestion = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  contentMarkdown: string;
};

export type FrontendFocusCategory = {
  id: FrontendFocusCategoryId;
  label: string;
  description: string;
  questions: FrontendFocusQuestion[];
};

type FrontendFocusManifest = {
  title: string;
  description: string;
  categories: FrontendFocusCategory[];
};

export type FrontendFocusQuestionView = FrontendFocusQuestion & {
  progress: FrontendFocusProgress | null;
  status: FrontendFocusStatus;
};

export type FrontendFocusCategorySummary = {
  total: number;
  done: number;
  doAgain: number;
  notDone: number;
  completionPct: number;
};

export type FrontendFocusCategoryView = Omit<FrontendFocusCategory, "questions"> & {
  questions: FrontendFocusQuestionView[];
  summary: FrontendFocusCategorySummary;
};

export type FrontendFocusResponse = {
  title: string;
  description: string;
  categories: FrontendFocusCategoryView[];
  summary: FrontendFocusCategorySummary;
};

const MANIFEST = frontendFocusJson as FrontendFocusManifest;

export const FRONTEND_FOCUS_CATEGORY_ORDER: FrontendFocusCategoryId[] = ["javascript-async", "dsa", "react-ui"];
export const FRONTEND_FOCUS_QUESTION_IDS = new Set(MANIFEST.categories.flatMap((category) => category.questions.map((question) => question.id)));

export function getFrontendFocusManifest(): FrontendFocusManifest {
  return MANIFEST;
}

function progressStatus(progress: FrontendFocusProgress | null): FrontendFocusStatus {
  return progress?.status ?? "NOT_DONE";
}

function buildSummary(statuses: FrontendFocusStatus[]): FrontendFocusCategorySummary {
  const total = statuses.length;
  const done = statuses.filter((status) => status === "DONE").length;
  const doAgain = statuses.filter((status) => status === "DO_AGAIN").length;
  const notDone = total - done - doAgain;
  return {
    total,
    done,
    doAgain,
    notDone,
    completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function buildFrontendFocusResponse(progressRecords: FrontendFocusProgress[]): FrontendFocusResponse {
  const progressByQuestionId = new Map(progressRecords.map((record) => [record.questionId, record]));

  const categories = FRONTEND_FOCUS_CATEGORY_ORDER.map((categoryId) => {
    const category = MANIFEST.categories.find((entry) => entry.id === categoryId);
    if (!category) {
      throw new Error(`Missing frontend focus category: ${categoryId}`);
    }

    const questions = category.questions.map((question) => {
      const progress = progressByQuestionId.get(question.id) ?? null;
      const status = progressStatus(progress);
      return {
        ...question,
        progress,
        status,
      };
    });

    return {
      ...category,
      questions,
      summary: buildSummary(questions.map((question) => question.status)),
    };
  });

  return {
    title: MANIFEST.title,
    description: MANIFEST.description,
    categories,
    summary: buildSummary(categories.flatMap((category) => category.questions.map((question) => question.status))),
  };
}
