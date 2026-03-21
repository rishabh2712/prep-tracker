import type {
  ConfidenceLevel,
  GoalDayEntry,
  GoalDayRecord,
  GoalModuleKind,
  GoalRecord,
  GoalSessionRecord,
  GoalTargetCoverageBucket,
  GoalTargetDimension,
  ItemState,
  ItemType,
  LinkRecord,
  MasteryLevel,
  PrepItem,
  ReviewLog,
} from "@/lib/types";

export type ContentItemRow = {
  id: string;
  owner_user_id: string | null;
  is_shared: boolean;
  title: string;
  type: ItemType;
  tags_json: string[] | null;
  deleted_at: string | null;
  canonical_key: string | null;
  payload_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ContentItemLinkRow = {
  id: string;
  content_item_id: string;
  label: string;
  url: string;
};

export type UserItemStateRow = {
  user_id: string;
  content_item_id: string;
  state: ItemState;
  mastery: MasteryLevel;
  should_review_again: boolean;
  review_interval_days: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  deleted_at: string | null;
  notes_markdown: string;
  metadata_json: Record<string, unknown> | null;
  attempt_count: number | null;
  time_spent_minutes: number | null;
  confidence: ConfidenceLevel | null;
  last_attempted_at: string | null;
  leetcode_outcome: PrepItem["leetcodeOutcome"];
  last_solved_at: string | null;
  solution_summary_markdown: string | null;
  created_at: string;
  updated_at: string;
};

export type UserReviewLogRow = {
  id: string;
  user_id: string;
  content_item_id: string;
  goal_id: string | null;
  outcome: ReviewLog["outcome"];
  quality: number;
  notes_markdown: string;
  previous_review_at: string | null;
  next_review_at: string;
  interval_before: number;
  interval_after: number;
  created_at: string;
};

export type UserItemDocRow = {
  user_id: string;
  content_item_id: string;
  content_markdown: string;
  checksum: string;
  updated_at: string;
};

export type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  leetcode_target: number;
  system_design_target: number;
  daily_minutes_target: number;
  status: GoalRecord["status"];
  created_at: string;
  updated_at: string;
};

export type GoalItemRow = {
  goal_id: string;
  content_item_id: string;
  module_kind: GoalModuleKind;
  selected_at: string;
};

export type GoalDayRow = {
  id: string;
  goal_id: string;
  date: string;
  status: GoalDayRecord["status"];
  planned_minutes: number;
  actual_minutes: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type GoalDayEntryRow = {
  id: string;
  goal_day_id: string;
  goal_id: string;
  content_item_id: string;
  item_type: GoalModuleKind;
  entry_type: GoalDayEntry["entryType"];
  created_at: string;
};

export type GoalTargetRow = {
  goal_id: string;
  module_kind: GoalModuleKind;
  dimension: GoalTargetDimension;
  bucket_key: string;
  target_count: number;
  created_at: string;
  updated_at: string;
};

export type GoalSessionRow = {
  id: string;
  goal_id: string;
  content_item_id: string;
  module_kind: GoalModuleKind;
  action: GoalSessionRecord["action"];
  session_at: string;
  minutes_spent: number;
  notes_markdown: string;
  created_at: string;
  updated_at: string;
};

export type HydratedContentItem = {
  content: ContentItemRow;
  links: LinkRecord[];
  state: UserItemStateRow | null;
};

export type TargetCoverageInput = {
  moduleKind: GoalModuleKind;
  dimension: GoalTargetDimension;
  bucketKey: string;
  targetCount: number;
  selectedCount: number;
  doneCount: number;
};

export type GoalProgressBuckets = GoalTargetCoverageBucket[];
