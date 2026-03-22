import { z } from "zod";
import {
  CONFIDENCE_LEVELS,
  ITEM_STATES,
  ITEM_TYPES,
  LEETCODE_OUTCOMES,
  MASTERY_LEVELS,
  REVIEW_OUTCOMES,
} from "@/lib/types";

const linkSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Link label is required"),
  url: z.string().trim().url("Link must be a valid URL"),
});

const metadataInputSchema = z.record(z.string(), z.unknown());
const metadataSchema = metadataInputSchema.optional().default({});

export const itemCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum(ITEM_TYPES),
  notesMarkdown: z.string().optional().default(""),
  state: z.enum(ITEM_STATES).optional().default("ACTIVE"),
  mastery: z.enum(MASTERY_LEVELS).optional().default("MEDIUM"),
  shouldReviewAgain: z.boolean().optional().default(true),
  reviewIntervalDays: z.number().int().min(0).max(120).optional().default(7),
  nextReviewAt: z.string().datetime().nullable().optional().default(null),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  links: z.array(linkSchema).optional().default([]),

  platform: z.string().trim().nullable().optional().default(null),
  problemLink: z.string().trim().url().nullable().optional().default(null),
  problemSlug: z.string().trim().nullable().optional().default(null),
  difficulty: z.string().trim().nullable().optional().default(null),
  pattern: z.string().trim().nullable().optional().default(null),
  attemptCount: z.number().int().min(0).nullable().optional().default(null),
  timeSpentMinutes: z.number().int().min(0).nullable().optional().default(null),
  confidence: z.enum(CONFIDENCE_LEVELS).nullable().optional().default(null),
  lastAttemptedAt: z.string().datetime().nullable().optional().default(null),
  leetcodeOutcome: z.enum(LEETCODE_OUTCOMES).nullable().optional().default(null),
  lastSolvedAt: z.string().datetime().nullable().optional().default(null),
  solutionSummaryMarkdown: z.string().nullable().optional().default(null),

  systemTopic: z.string().trim().nullable().optional().default(null),
  systemScaleNotes: z.string().trim().nullable().optional().default(null),
  problemStatement: z.string().trim().nullable().optional().default(null),
  functionalRequirements: z.string().trim().nullable().optional().default(null),
  nonFunctionalRequirements: z.string().trim().nullable().optional().default(null),
  capacityEstimates: z.string().trim().nullable().optional().default(null),
  apiContracts: z.string().trim().nullable().optional().default(null),
  dataModelNotes: z.string().trim().nullable().optional().default(null),
  architectureNotes: z.string().trim().nullable().optional().default(null),
  componentDeepDives: z.string().trim().nullable().optional().default(null),
  scalingStrategy: z.string().trim().nullable().optional().default(null),
  consistencyTradeoffs: z.string().trim().nullable().optional().default(null),
  cachingStrategy: z.string().trim().nullable().optional().default(null),
  failureModesRecovery: z.string().trim().nullable().optional().default(null),
  observability: z.string().trim().nullable().optional().default(null),
  securityPrivacy: z.string().trim().nullable().optional().default(null),
  costConsiderations: z.string().trim().nullable().optional().default(null),
  alternativesTradeoffs: z.string().trim().nullable().optional().default(null),
  whatIMissed: z.string().trim().nullable().optional().default(null),
  followUpTopics: z.string().trim().nullable().optional().default(null),

  metadata: metadataSchema,
});

export const itemUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  type: z.enum(ITEM_TYPES).optional(),
  notesMarkdown: z.string().optional(),
  state: z.enum(ITEM_STATES).optional(),
  mastery: z.enum(MASTERY_LEVELS).optional(),
  shouldReviewAgain: z.boolean().optional(),
  reviewIntervalDays: z.number().int().min(0).max(120).optional(),
  nextReviewAt: z.string().datetime().nullable().optional(),
  lastReviewedAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  links: z.array(linkSchema).optional(),

  platform: z.string().trim().nullable().optional(),
  problemLink: z.string().trim().url().nullable().optional(),
  problemSlug: z.string().trim().nullable().optional(),
  difficulty: z.string().trim().nullable().optional(),
  pattern: z.string().trim().nullable().optional(),
  attemptCount: z.number().int().min(0).nullable().optional(),
  timeSpentMinutes: z.number().int().min(0).nullable().optional(),
  confidence: z.enum(CONFIDENCE_LEVELS).nullable().optional(),
  lastAttemptedAt: z.string().datetime().nullable().optional(),
  leetcodeOutcome: z.enum(LEETCODE_OUTCOMES).nullable().optional(),
  lastSolvedAt: z.string().datetime().nullable().optional(),
  solutionSummaryMarkdown: z.string().nullable().optional(),

  systemTopic: z.string().trim().nullable().optional(),
  systemScaleNotes: z.string().trim().nullable().optional(),
  problemStatement: z.string().trim().nullable().optional(),
  functionalRequirements: z.string().trim().nullable().optional(),
  nonFunctionalRequirements: z.string().trim().nullable().optional(),
  capacityEstimates: z.string().trim().nullable().optional(),
  apiContracts: z.string().trim().nullable().optional(),
  dataModelNotes: z.string().trim().nullable().optional(),
  architectureNotes: z.string().trim().nullable().optional(),
  componentDeepDives: z.string().trim().nullable().optional(),
  scalingStrategy: z.string().trim().nullable().optional(),
  consistencyTradeoffs: z.string().trim().nullable().optional(),
  cachingStrategy: z.string().trim().nullable().optional(),
  failureModesRecovery: z.string().trim().nullable().optional(),
  observability: z.string().trim().nullable().optional(),
  securityPrivacy: z.string().trim().nullable().optional(),
  costConsiderations: z.string().trim().nullable().optional(),
  alternativesTradeoffs: z.string().trim().nullable().optional(),
  whatIMissed: z.string().trim().nullable().optional(),
  followUpTopics: z.string().trim().nullable().optional(),

  metadata: metadataInputSchema.optional(),
});

export const reviewSchema = z.object({
  outcome: z.enum(REVIEW_OUTCOMES),
  notesMarkdown: z.string().optional().default(""),
  goalId: z.string().uuid().optional(),
});

export const goalCreateSchema = z.object({
  name: z.string().trim().min(1, "Goal name is required"),
  description: z.string().trim().optional().default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leetcodeTarget: z.number().int().min(0).max(5000).default(0),
  systemDesignTarget: z.number().int().min(0).max(2000).default(0),
  dailyMinutesTarget: z.number().int().min(15).max(600).default(120),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).optional().default("ACTIVE"),
});

export const goalUpdateSchema = goalCreateSchema.partial();

export const goalDayUpdateSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  plannedMinutes: z.number().int().min(0).max(1000).optional(),
  actualMinutes: z.number().int().min(0).max(1000).optional(),
  notes: z.string().optional(),
});

export const goalItemAddSchema = z.object({
  itemId: z.string().uuid(),
});

const goalModuleKindSchema = z.enum(["LEETCODE", "SYSTEM_DESIGN"]);
const goalTargetDimensionSchema = z.enum(["PATTERN", "DIFFICULTY", "COMPANY", "CONCEPT", "LEVEL", "TRACK"]);
const goalSessionActionSchema = z.enum(["LEETCODE_SOLVED", "SYSTEM_DESIGN_READ", "PRACTICE", "REVIEW"]);

export const markdownSaveSchema = z.object({
  content: z.string(),
  expectedChecksum: z.string().optional(),
});

export const goalDayEntryCreateSchema = z.object({
  itemId: z.string().uuid(),
  entryType: z.enum(["LEETCODE_SOLVED", "SYSTEM_DESIGN_READ"]),
});

export const goalDayEntryDeleteSchema = z.object({
  entryId: z.string().uuid(),
});

export const goalTargetUpsertSchema = z.object({
  moduleKind: goalModuleKindSchema,
  dimension: goalTargetDimensionSchema,
  bucketKey: z.string().trim().min(1),
  targetCount: z.number().int().min(0).max(5000),
});

export const goalTargetDeleteSchema = z.object({
  moduleKind: goalModuleKindSchema,
  dimension: goalTargetDimensionSchema,
  bucketKey: z.string().trim().min(1),
});

export const goalTargetReplaceSchema = z.object({
  moduleKind: goalModuleKindSchema,
  dimension: goalTargetDimensionSchema,
  targets: z.array(
    z.object({
      bucketKey: z.string().trim().min(1),
      targetCount: z.number().int().min(0).max(5000),
    })
  ),
});

export const goalSessionCreateSchema = z.object({
  moduleKind: goalModuleKindSchema,
  itemId: z.string().uuid(),
  action: goalSessionActionSchema,
  sessionAt: z.string().datetime().optional(),
  minutesSpent: z.number().int().min(0).max(1440).optional().default(0),
  notesMarkdown: z.string().optional().default(""),
  reviewOutcome: z.enum(REVIEW_OUTCOMES).optional(),
});

export const goalSessionDeleteSchema = z.object({
  sessionId: z.string().uuid(),
});

export const agentIngestSchema = z.object({
  type: z.enum(["LEETCODE", "SYSTEM_DESIGN"]),
  title: z.string().trim().min(1),
  problemLink: z.string().trim().url().nullable().optional(),
  problemSlug: z.string().trim().nullable().optional(),
  difficulty: z.string().trim().nullable().optional(),
  pattern: z.string().trim().nullable().optional(),
  systemTopic: z.string().trim().nullable().optional(),
  notesMarkdown: z.string().optional(),
  markdownContent: z.string().optional(),
  tags: z.array(z.string()).optional(),
  goalName: z.string().trim().optional(),
  reviewOutcome: z.enum(REVIEW_OUTCOMES).optional(),
});

export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type GoalCreateInput = z.infer<typeof goalCreateSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
export type GoalDayUpdateInput = z.infer<typeof goalDayUpdateSchema>;
export type MarkdownSaveInput = z.infer<typeof markdownSaveSchema>;
export type AgentIngestInput = z.infer<typeof agentIngestSchema>;
export type GoalDayEntryCreateInput = z.infer<typeof goalDayEntryCreateSchema>;
export type GoalTargetUpsertInput = z.infer<typeof goalTargetUpsertSchema>;
export type GoalTargetDeleteInput = z.infer<typeof goalTargetDeleteSchema>;
export type GoalTargetReplaceInput = z.infer<typeof goalTargetReplaceSchema>;
export type GoalSessionCreateInput = z.infer<typeof goalSessionCreateSchema>;
export type GoalSessionDeleteInput = z.infer<typeof goalSessionDeleteSchema>;
