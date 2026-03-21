export const ITEM_TYPES = [
  "SYSTEM_DESIGN",
  "LLD",
  "LEETCODE",
  "BEHAVIORAL",
  "CS_FUNDAMENTALS",
  "MOCK_INTERVIEW",
  "PROJECT",
  "OTHER",
] as const;

export const ITEM_STATES = ["ACTIVE", "DONE", "ARCHIVED"] as const;
export const MASTERY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export const CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export const LEETCODE_OUTCOMES = ["TODO", "SOLVED", "PARTIAL", "STUCK"] as const;
export const REVIEW_OUTCOMES = ["AGAIN", "HARD", "GOOD", "EASY"] as const;

export type ItemType = (typeof ITEM_TYPES)[number];
export type ItemState = (typeof ITEM_STATES)[number];
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export type LeetcodeOutcome = (typeof LEETCODE_OUTCOMES)[number];
export type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

export type LinkRecord = {
  id: string;
  label: string;
  url: string;
};

export type PrepItem = {
  id: string;
  ownerUserId: string | null;
  isShared: boolean;
  title: string;
  type: ItemType;
  notesMarkdown: string;
  state: ItemState;
  mastery: MasteryLevel;
  shouldReviewAgain: boolean;
  reviewIntervalDays: number;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  tags: string[];
  deletedAt: string | null;
  links: LinkRecord[];

  platform: string | null;
  problemLink: string | null;
  problemSlug: string | null;
  difficulty: string | null;
  pattern: string | null;
  attemptCount: number | null;
  timeSpentMinutes: number | null;
  confidence: ConfidenceLevel | null;
  lastAttemptedAt: string | null;
  leetcodeOutcome: LeetcodeOutcome | null;
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
  createdAt: string;
  updatedAt: string;
};

export type AppProfile = {
  userId: string;
  email: string | null;
  displayName: string | null;
};

export type ReviewLog = {
  id: string;
  itemId: string;
  outcome: ReviewOutcome;
  notesMarkdown: string;
  previousReviewAt: string | null;
  nextReviewAt: string;
  createdAt: string;
};

export type ChangeAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "HARD_DELETE"
  | "REVIEW";

export type ChangeLog = {
  id: string;
  itemId: string | null;
  action: ChangeAction;
  details: Record<string, unknown>;
  createdAt: string;
};

export type ProgressTargets = {
  leetcodeTarget: number;
  systemDesignTarget: number;
  targetDate: string | null;
  updatedAt: string;
};

export type ModuleProgress = {
  target: number;
  done: number;
  remaining: number;
  completionPct: number;
  velocityPerWeek: number;
  etaDays: number | null;
};

export type ProgressSnapshot = {
  leetcode: ModuleProgress;
  systemDesign: ModuleProgress;
  overall: ModuleProgress;
  targetDate: string | null;
  paceStatus: "NO_TARGET_DATE" | "ON_TRACK" | "AT_RISK";
};

export type ListItemsParams = {
  q?: string;
  type?: ItemType | "ALL";
  includeDeleted?: boolean;
  dueOnly?: boolean;
  shouldReviewOnly?: boolean;
};

export type GoalStatus = "ACTIVE" | "PAUSED" | "COMPLETED";
export type GoalModuleKind = "LEETCODE" | "SYSTEM_DESIGN";
export type GoalTargetDimension = "PATTERN" | "DIFFICULTY" | "COMPANY" | "CONCEPT" | "LEVEL" | "TRACK";
export type GoalSessionAction = "LEETCODE_SOLVED" | "SYSTEM_DESIGN_READ" | "PRACTICE" | "REVIEW";

export type GoalRecord = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  leetcodeTarget: number;
  systemDesignTarget: number;
  dailyMinutesTarget: number;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
};

export type GoalItemRecord = {
  goalId: string;
  itemId: string;
  moduleKind: GoalModuleKind;
  selectedAt: string;
  item: PrepItem;
};

export type GoalDayRecord = {
  id: string;
  goalId: string;
  date: string;
  status: DayStatus;
  plannedMinutes: number;
  actualMinutes: number;
  notes: string;
  entries?: GoalDayEntry[];
};

export type GoalDayEntry = {
  id: string;
  dayId: string;
  goalId: string;
  itemId: string;
  itemTitle: string;
  itemType: GoalModuleKind;
  entryType: "LEETCODE_SOLVED" | "SYSTEM_DESIGN_READ";
  createdAt: string;
};

export type GoalTargetRecord = {
  goalId: string;
  moduleKind: GoalModuleKind;
  dimension: GoalTargetDimension;
  bucketKey: string;
  targetCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GoalTargetCoverageBucket = {
  moduleKind: GoalModuleKind;
  dimension: GoalTargetDimension;
  bucketKey: string;
  targetCount: number;
  selectedCount: number;
  doneCount: number;
  coveragePct: number;
  donePct: number;
};

export type GoalSessionRecord = {
  id: string;
  goalId: string;
  moduleKind: GoalModuleKind;
  itemId: string;
  itemTitle: string;
  action: GoalSessionAction;
  sessionAt: string;
  minutesSpent: number;
  notesMarkdown: string;
  createdAt: string;
  updatedAt: string;
};

export type PrepPacketQuestion = {
  label: string;
  raw: string;
  problemId: number | null;
  title: string;
};

export type PrepPacketDay = {
  dayNumber: number;
  date: string | null;
  heading: string;
  concept: string | null;
  subFocus: string | null;
  codingCore: PrepPacketQuestion[];
  codingStretch: PrepPacketQuestion | null;
  designPrompt: string | null;
  buildTask: string | null;
  leadershipQuestion: string | null;
  reviewPrompts: string[];
  rawMarkdown: string;
};

export type GoalProgress = {
  goal: GoalRecord;
  selected: {
    leetcode: number;
    systemDesign: number;
    total: number;
  };
  done: {
    leetcode: number;
    systemDesign: number;
    total: number;
  };
  targets: {
    leetcode: number;
    systemDesign: number;
    total: number;
  };
  dueReviews: Array<{
    itemId: string;
    title: string;
    moduleKind: GoalModuleKind;
    dueAt: string;
  }>;
  targetCoverage: GoalTargetCoverageBucket[];
  sessionsSummary: {
    totalSessions: number;
    totalMinutes: number;
    last7dSessions: number;
    last7dMinutes: number;
    lastActivityAt: string | null;
  };
  progress: ProgressSnapshot;
};

export type SystemDesignMarkdownDoc = {
  itemId: string;
  path: string;
  content: string;
  checksum: string;
  updatedAt: string;
};

export type DayStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
