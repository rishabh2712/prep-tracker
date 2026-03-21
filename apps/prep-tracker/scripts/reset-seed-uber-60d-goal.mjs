#!/usr/bin/env node

import { closeSql } from "./lib/shared-content-store.mjs";
import {
  addGoalItemForSeedUser,
  createGoalForSeedUser,
  deleteGoalForSeedUser,
  listGoalsForSeedUser,
  replaceGoalTargetsForSeedUser,
} from "./lib/goal-admin-store.mjs";
import {
  hardDeletePrivateItemForSeedUser,
  ingestPrivateItemForSeedUser,
  listAccessibleItemsForSeedUser,
} from "./lib/user-item-store.mjs";

const GOAL_NAME = "Uber Staff 60D - Core+GenAI";

const LEETCODE_BANK = [
  ["Two Sum", "two-sum", "Easy", "Arrays & Hashing", "uber|meta"],
  ["Valid Anagram", "valid-anagram", "Easy", "Arrays & Hashing", "uber"],
  ["Group Anagrams", "group-anagrams", "Medium", "Arrays & Hashing", "uber|google"],
  ["Top K Frequent Elements", "top-k-frequent-elements", "Medium", "Arrays & Hashing", "uber|meta"],
  ["Product of Array Except Self", "product-of-array-except-self", "Medium", "Arrays & Hashing", "uber|meta"],
  ["Longest Consecutive Sequence", "longest-consecutive-sequence", "Medium", "Arrays & Hashing", "uber"],
  ["3Sum", "3sum", "Medium", "Two Pointers", "uber|meta"],
  ["Container With Most Water", "container-with-most-water", "Medium", "Two Pointers", "uber"],
  ["Trapping Rain Water", "trapping-rain-water", "Hard", "Two Pointers", "uber|google"],
  ["Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", "Easy", "Sliding Window", "uber"],
  ["Longest Substring Without Repeating Characters", "longest-substring-without-repeating-characters", "Medium", "Sliding Window", "uber|amazon"],
  ["Longest Repeating Character Replacement", "longest-repeating-character-replacement", "Medium", "Sliding Window", "uber"],
  ["Minimum Window Substring", "minimum-window-substring", "Hard", "Sliding Window", "uber|meta"],
  ["Permutation in String", "permutation-in-string", "Medium", "Sliding Window", "uber"],
  ["Valid Parentheses", "valid-parentheses", "Easy", "Stack", "uber"],
  ["Min Stack", "min-stack", "Medium", "Stack", "uber"],
  ["Daily Temperatures", "daily-temperatures", "Medium", "Stack", "uber"],
  ["Car Fleet", "car-fleet", "Medium", "Stack", "uber"],
  ["Largest Rectangle in Histogram", "largest-rectangle-in-histogram", "Hard", "Stack", "uber|meta"],
  ["Binary Search", "binary-search", "Easy", "Binary Search", "uber"],
  ["Search in Rotated Sorted Array", "search-in-rotated-sorted-array", "Medium", "Binary Search", "uber"],
  ["Find Minimum in Rotated Sorted Array", "find-minimum-in-rotated-sorted-array", "Medium", "Binary Search", "uber"],
  ["Koko Eating Bananas", "koko-eating-bananas", "Medium", "Binary Search", "uber"],
  ["Median of Two Sorted Arrays", "median-of-two-sorted-arrays", "Hard", "Binary Search", "uber"],
  ["Reverse Linked List", "reverse-linked-list", "Easy", "Linked List", "uber"],
  ["Merge Two Sorted Lists", "merge-two-sorted-lists", "Easy", "Linked List", "uber"],
  ["Reorder List", "reorder-list", "Medium", "Linked List", "uber"],
  ["Remove Nth Node From End of List", "remove-nth-node-from-end-of-list", "Medium", "Linked List", "uber"],
  ["Copy List with Random Pointer", "copy-list-with-random-pointer", "Medium", "Linked List", "uber"],
  ["LRU Cache", "lru-cache", "Medium", "Linked List", "uber|google"],
  ["Invert Binary Tree", "invert-binary-tree", "Easy", "Trees", "uber"],
  ["Maximum Depth of Binary Tree", "maximum-depth-of-binary-tree", "Easy", "Trees", "uber"],
  ["Diameter of Binary Tree", "diameter-of-binary-tree", "Easy", "Trees", "uber"],
  ["Binary Tree Level Order Traversal", "binary-tree-level-order-traversal", "Medium", "Trees", "uber"],
  ["Validate Binary Search Tree", "validate-binary-search-tree", "Medium", "Trees", "uber"],
  ["Kth Smallest Element in a BST", "kth-smallest-element-in-a-bst", "Medium", "Trees", "uber"],
  ["Lowest Common Ancestor of a Binary Search Tree", "lowest-common-ancestor-of-a-binary-search-tree", "Medium", "Trees", "uber"],
  ["Kth Largest Element in an Array", "kth-largest-element-in-an-array", "Medium", "Heap / Priority Queue", "uber"],
  ["Find Median from Data Stream", "find-median-from-data-stream", "Hard", "Heap / Priority Queue", "uber"],
  ["Merge k Sorted Lists", "merge-k-sorted-lists", "Hard", "Heap / Priority Queue", "uber"],
  ["Task Scheduler", "task-scheduler", "Medium", "Heap / Priority Queue", "uber"],
  ["Number of Islands", "number-of-islands", "Medium", "Graphs", "uber"],
  ["Clone Graph", "clone-graph", "Medium", "Graphs", "uber"],
  ["Course Schedule", "course-schedule", "Medium", "Graphs", "uber"],
  ["Course Schedule II", "course-schedule-ii", "Medium", "Graphs", "uber"],
  ["Pacific Atlantic Water Flow", "pacific-atlantic-water-flow", "Medium", "Graphs", "uber"],
  ["Rotting Oranges", "rotting-oranges", "Medium", "Graphs", "uber"],
  ["Network Delay Time", "network-delay-time", "Medium", "Advanced Graphs", "uber"],
  ["Cheapest Flights Within K Stops", "cheapest-flights-within-k-stops", "Medium", "Advanced Graphs", "uber"],
  ["Minimum Cost to Connect All Points", "min-cost-to-connect-all-points", "Medium", "Advanced Graphs", "uber"],
  ["Swim in Rising Water", "swim-in-rising-water", "Hard", "Advanced Graphs", "uber"],
  ["Climbing Stairs", "climbing-stairs", "Easy", "1-D Dynamic Programming", "uber"],
  ["House Robber", "house-robber", "Medium", "1-D Dynamic Programming", "uber"],
  ["House Robber II", "house-robber-ii", "Medium", "1-D Dynamic Programming", "uber"],
  ["Coin Change", "coin-change", "Medium", "1-D Dynamic Programming", "uber"],
  ["Longest Increasing Subsequence", "longest-increasing-subsequence", "Medium", "1-D Dynamic Programming", "uber"],
  ["Word Break", "word-break", "Medium", "1-D Dynamic Programming", "uber"],
  ["Decode Ways", "decode-ways", "Medium", "1-D Dynamic Programming", "uber"],
  ["Longest Common Subsequence", "longest-common-subsequence", "Medium", "2-D Dynamic Programming", "uber"],
  ["Edit Distance", "edit-distance", "Hard", "2-D Dynamic Programming", "uber"],
  ["Alien Dictionary", "alien-dictionary", "Hard", "Graphs", "uber"],
  ["Bus Routes", "bus-routes", "Hard", "Graphs", "uber"],
  ["Construct Quad Tree", "construct-quad-tree", "Medium", "Trees", "uber"],
  ["Collect Coins in a Tree", "collect-coins-in-a-tree", "Hard", "Trees", "uber"],
  ["Squares of a Sorted Array", "squares-of-a-sorted-array", "Easy", "Two Pointers", "uber"],
  ["Rotating the Box", "rotating-the-box", "Medium", "Two Pointers", "uber"],
  [
    "Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit",
    "longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit",
    "Medium",
    "Sliding Window",
    "uber",
  ],
  ["Evaluate Division", "evaluate-division", "Medium", "Graphs", "uber"],
  ["My Calendar I", "my-calendar-i", "Medium", "Intervals", "uber"],
  ["Meeting Rooms II", "meeting-rooms-ii", "Medium", "Intervals", "uber"],
  ["Merge Intervals", "merge-intervals", "Medium", "Intervals", "uber"],
  ["Insert Interval", "insert-interval", "Medium", "Intervals", "uber"],
  ["Non-overlapping Intervals", "non-overlapping-intervals", "Medium", "Intervals", "uber"],
].map(([title, slug, difficulty, pattern, companies]) => ({
  title,
  slug,
  difficulty,
  pattern,
  companies: String(companies)
    .split("|")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
  link: `https://leetcode.com/problems/${slug}/`,
}));

const SYSTEM_BACKEND_CORE = [
  ["Design API Rate Limiter", "Foundations", "EASY"],
  ["Design URL Shortener", "Foundations", "EASY"],
  ["Design API Gateway with AuthN/AuthZ", "Foundations", "MEDIUM"],
  ["Design Distributed Cache", "Foundations", "MEDIUM"],
  ["Design Notification Service", "Realtime Communication", "MEDIUM"],
  ["Design Chat Messaging Service", "Realtime Communication", "MEDIUM"],
  ["Design Ride Matching Service", "Matching & Dispatch", "HARD"],
  ["Design Dispatch Queueing and Rebalancing", "Matching & Dispatch", "HARD"],
  ["Design Real-Time Location Tracking", "Geo, ETA & Routing", "MEDIUM"],
  ["Design Driver ETA Service", "Geo, ETA & Routing", "HARD"],
  ["Design Surge Pricing Engine", "Marketplace & Pricing", "HARD"],
  ["Design Dynamic Incentives Service", "Marketplace & Pricing", "MEDIUM"],
  ["Design Idempotent Payment Processing", "Payments & Reliability", "MEDIUM"],
  ["Design Refund/Reversal Workflow", "Payments & Reliability", "MEDIUM"],
  ["Design Trust and Safety Signal Pipeline", "Trust, Safety & Feedback", "MEDIUM"],
  ["Design Ratings and Feedback Service", "Trust, Safety & Feedback", "EASY"],
  ["Design Feature Flag and Experimentation Platform", "Experimentation & Platform", "MEDIUM"],
  ["Design Search Autocomplete", "Search & Discovery", "MEDIUM"],
].map(([title, concept, level]) => ({ title, concept, level, track: "backend-core" }));

const SYSTEM_GENAI_BACKEND = [
  ["Design Enterprise RAG Platform", "HARD"],
  ["Design Embedding Ingestion and Index Refresh Pipeline", "HARD"],
  ["Design Retrieval and Re-ranking Service for Knowledge Assistants", "HARD"],
  ["Design Citation Grounding Service for LLM Responses", "MEDIUM"],
  ["Design Semantic Cache for LLM Responses", "MEDIUM"],
  ["Design LLM Gateway with Model Routing and Cost Controls", "HARD"],
  ["Design Prompt Management and Evaluation Platform", "MEDIUM"],
  ["Design Offline Eval Harness for GenAI Regression Testing", "MEDIUM"],
  ["Design Human Feedback and Labeling Pipeline for LLM Quality", "MEDIUM"],
  ["Design Guardrails and Policy Enforcement for GenAI", "HARD"],
  ["Design Conversation Memory Store for Agents", "MEDIUM"],
  ["Design Agent Tool-Calling Runtime", "HARD"],
  ["Design Multi-Agent Orchestration Platform", "HARD"],
  ["Design Tool Execution Sandbox and Permissioning", "HARD"],
  ["Design Agent Trace and Replay Platform", "MEDIUM"],
  ["Design Hallucination Detection and Escalation Pipeline", "HARD"],
  ["Design Provider Outage Fallback and Resilience Orchestrator", "HARD"],
  ["Design Latency Budget Orchestration for RAG and Generation", "HARD"],
  ["Design Tenant Quota and Cost Metering for LLM Workloads", "MEDIUM"],
  ["Design Prompt Injection Defense and Isolation Strategy", "HARD"],
].map(([title, level]) => ({
  title,
  concept: "AI / GenAI Systems",
  level,
  track: "genai-backend-orchestration",
}));

const SYSTEM_GENAI_FRONTEND_LLD = [
  ["LLD: Build Chat SDK with Streaming Tokens and Transport Abstraction", "HARD"],
  ["LLD: Resume Streams and Reconcile Message State After Reconnect", "HARD"],
  ["LLD: Tool-Call State Machine for Pending Running Success Error", "MEDIUM"],
  ["LLD: Persistent Conversation Store with Optimistic Reconciliation", "MEDIUM"],
  ["LLD: Citation Renderer with Provenance Panel", "EASY"],
  ["LLD: Generative UI Component Registry and Runtime Renderer", "HARD"],
  ["LLD: Prompt Playground with Version Compare and Rollback", "MEDIUM"],
  ["LLD: Evaluation Dashboard Frontend Shell for Model Outputs", "MEDIUM"],
  ["LLD: Model Output Diff Viewer with Semantic Highlights", "MEDIUM"],
  ["LLD: Accessibility-First Streaming Chat Surfaces", "MEDIUM"],
  ["LLD: SDK Plugin Architecture for Internal Tools", "HARD"],
  ["LLD: Telemetry Hooks for TTFT, Latency, and Cost Metrics", "MEDIUM"],
  ["LLD: Error Taxonomy and Retry Orchestration in Chat SDK", "MEDIUM"],
  ["LLD: MCP-style Tool Integration Client Surface", "HARD"],
].map(([title, level]) => ({
  title,
  concept: "AI / GenAI Systems",
  level,
  track: "genai-frontend-lld",
}));

const SYSTEM_DISTRIBUTED = [
  ["Design Quorum-based Key-Value Store", "Distributed Systems Fundamentals", "HARD"],
  ["Design Consistent Hashing Ring with Rebalancing", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Leader Election using Raft", "Distributed Systems Fundamentals", "HARD"],
  ["Design Replicated Log and State Machine", "Distributed Systems Fundamentals", "HARD"],
  ["Design Idempotency Strategy for At-Least-Once Delivery", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Saga-based Distributed Transactions", "Distributed Systems Fundamentals", "HARD"],
  ["Design 2PC Coordinator with Failure Recovery", "Distributed Systems Fundamentals", "HARD"],
  ["Design Global Event Ordering with Logical Clocks", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Causal Consistency with Version Vectors", "Distributed Systems Fundamentals", "HARD"],
  ["Design Multi-region Request Routing and Failover", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Backpressure and Load Shedding for Overload", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Exactly-once Illusion with Dedup + Outbox", "Distributed Systems Fundamentals", "HARD"],
  ["Design Retry, Timeout, and Circuit-Breaker Policy", "Distributed Systems Fundamentals", "EASY"],
  ["Design Distributed Lock Service", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Reliable Pub/Sub with Ordering Guarantees", "Distributed Systems Fundamentals", "HARD"],
  ["Design Read/Write Quorum Tuning under Partitions", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Failure Detector for Large Cluster", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Membership and Gossip Service", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Service Discovery for Multi-region Microservices", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Split-Brain Prevention with Fencing Tokens", "Distributed Systems Fundamentals", "HARD"],
  ["Design Lease-based Leader Election", "Distributed Systems Fundamentals", "HARD"],
  ["Design Logical Clock-based Causality Tracking", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Snapshotting Strategy for Replicated State Machine", "Distributed Systems Fundamentals", "HARD"],
  ["Design WAL + Checkpoint Recovery Workflow", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Exactly-once Payment Event Processing", "Distributed Systems Fundamentals", "HARD"],
  ["Design Outbox + CDC Pipeline for Reliable Integration", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Thundering Herd Protection in Distributed Cache", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Multi-tenant Rate Limiter at Global Scale", "Distributed Systems Fundamentals", "HARD"],
  ["Design Sticky Session vs Stateless Session Strategy", "Distributed Systems Fundamentals", "EASY"],
  ["Design PCC vs OCC Tradeoff for Contended Workloads", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Serializable Snapshot Isolation at Scale", "Distributed Systems Fundamentals", "HARD"],
  ["Design Dead Letter Queue and Replay Workflow", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Stream Processing Watermark Strategy", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design End-to-End Trace Context Propagation", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Circuit Breaker State Machine", "Distributed Systems Fundamentals", "EASY"],
  ["Design Bulkhead Isolation for Shared Services", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Adaptive Load Shedding Controller", "Distributed Systems Fundamentals", "HARD"],
  ["Design Coordinated Omission-safe Latency Measurement", "Distributed Systems Fundamentals", "HARD"],
  ["Design CAP/PACELC-informed Storage Strategy", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design CRDT-based Conflict Resolution in Multi-primary", "Distributed Systems Fundamentals", "HARD"],
  ["Design Token Bucket + Leaky Bucket Hybrid Limiter", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Multi-cloud Failover with Data Consistency Guardrails", "Distributed Systems Fundamentals", "HARD"],
  ["Design DNS + Global LB Failover Strategy", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Coordinated Rollback for Distributed Deployments", "Distributed Systems Fundamentals", "HARD"],
  ["Design SLO-driven Autoscaling Strategy", "Distributed Systems Fundamentals", "MEDIUM"],
  ["Design Chaos Testing Plan for Critical Distributed Workflows", "Distributed Systems Fundamentals", "MEDIUM"],
].map(([title, concept, level]) => ({ title, concept, level, track: "distributed-systems" }));

const SYSTEM_BANK = [
  ...SYSTEM_BACKEND_CORE,
  ...SYSTEM_GENAI_BACKEND,
  ...SYSTEM_GENAI_FRONTEND_LLD,
  ...SYSTEM_DISTRIBUTED,
];

function toSlug(raw) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function leetcodeNotes(problem) {
  return (
    `# ${problem.title}\n\n` +
    `- Pattern: ${problem.pattern}\n` +
    `- Difficulty: ${problem.difficulty}\n` +
    `- Companies: ${problem.companies.join(", ")}\n` +
    `- Focus: communicate tradeoffs and edge cases clearly.\n\n` +
    `## Solve Checklist\n` +
    `- Restate constraints\n` +
    `- Write brute force first\n` +
    `- Derive optimal complexity\n` +
    `- Enumerate edge cases\n`
  );
}

function systemMarkdown(problem) {
  return (
    `# ${problem.title}\n\n` +
    `## Context\n` +
    `- Track: ${problem.track}\n` +
    `- Concept: ${problem.concept}\n` +
    `- Level: ${problem.level}\n\n` +
    `## Requirements\n` +
    `- Functional requirements\n` +
    `- Non-functional requirements\n\n` +
    `## Architecture\n` +
    `- Components and data flow\n` +
    `- APIs and contracts\n` +
    `- Storage/index choices\n\n` +
    `## Scalability and Reliability\n` +
    `- Capacity envelope\n` +
    `- Failure modes and recovery\n` +
    `- Backpressure and overload controls\n\n` +
    `## Observability and Rollout\n` +
    `- SLOs and key metrics\n` +
    `- Progressive rollout plan\n`
  );
}

async function removeExistingUberSeedItems() {
  const items = await listAccessibleItemsForSeedUser({ type: "ALL", includeDeleted: false });

  const toDelete = items.filter((item) => {
    const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : [];
    return tags.includes("uber-60d") || tags.includes("uber-prep") || tags.includes("track:distributed-systems");
  });

  let deleted = 0;
  for (const item of toDelete) {
    if (await hardDeletePrivateItemForSeedUser(item.id)) deleted += 1;
  }
  return { deleted, count: toDelete.length };
}

async function deleteAllGoals() {
  const goals = await listGoalsForSeedUser();

  let deleted = 0;
  for (const goal of goals) {
    const removed = await deleteGoalForSeedUser(goal.id);
    if (!removed) throw new Error(`Failed to delete goal ${goal.id}`);
    deleted += 1;
  }

  return deleted;
}

async function upsertLeetcode() {
  const ids = [];
  for (const problem of LEETCODE_BANK) {
    const ingest = await ingestPrivateItemForSeedUser({
      type: "LEETCODE",
      title: problem.title,
      problemLink: problem.link,
      problemSlug: problem.slug,
      difficulty: problem.difficulty,
      pattern: problem.pattern,
      notesMarkdown: leetcodeNotes(problem),
      tags: [
        "leetcode",
        "uber-60d",
        "uber-prep",
        "track:leetcode",
        "source:uber-company-bank",
        `difficulty:${problem.difficulty.toLowerCase()}`,
        `pattern:${problem.pattern.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        ...problem.companies.map((company) => `company:${company}`),
      ],
    });
    ids.push(ingest.item.id);
  }
  return ids;
}

async function upsertSystemDesign() {
  const idsByTrack = {
    "backend-core": [],
    "genai-backend-orchestration": [],
    "genai-frontend-lld": [],
    "distributed-systems": [],
  };

  for (const problem of SYSTEM_BANK) {
    const ingest = await ingestPrivateItemForSeedUser({
      type: "SYSTEM_DESIGN",
      title: problem.title,
      systemTopic: `${problem.track}-${toSlug(problem.title)}`,
      notesMarkdown: `# ${problem.title}\n\nTrack: ${problem.track}`,
      markdownContent: systemMarkdown(problem),
      tags: [
        "system-design",
        "uber-60d",
        "uber-prep",
        `track:${problem.track}`,
        `sd-concept:${problem.concept.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        `sd-level:${problem.level.toLowerCase()}`,
        problem.track === "genai-frontend-lld" ? "lld" : "",
      ],
    });
    idsByTrack[problem.track].push(ingest.item.id);
  }

  return idsByTrack;
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([bucketKey, targetCount]) => ({ bucketKey, targetCount }));
}

async function createGoal(leetcodeCount, systemCount) {
  const startDate = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 59 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return createGoalForSeedUser({
    name: GOAL_NAME,
    description:
      "60-day prep goal covering Uber-focused LeetCode, backend system design, GenAI backend orchestration, GenAI frontend+LLD, and distributed systems",
    startDate,
    endDate,
    leetcodeTarget: leetcodeCount,
    systemDesignTarget: systemCount,
    dailyMinutesTarget: 210,
    status: "ACTIVE",
  });
}

async function addItemsToGoal(goalId, itemIds) {
  let linked = 0;
  for (const itemId of itemIds) {
    const moduleKind = systemIdsHint.has(itemId) ? "SYSTEM_DESIGN" : "LEETCODE";
    await addGoalItemForSeedUser(goalId, itemId, moduleKind);
    linked += 1;
  }
  return linked;
}

async function setGoalTargets(goalId, leetcodeItems, systemTrackCounts) {
  const lcDifficulty = countBy(leetcodeItems, (item) => item.difficulty);
  const lcPattern = countBy(leetcodeItems, (item) => item.pattern);

  const targetsToSet = [
    { moduleKind: "LEETCODE", dimension: "TRACK", targets: [{ bucketKey: "leetcode", targetCount: leetcodeItems.length }] },
    { moduleKind: "LEETCODE", dimension: "DIFFICULTY", targets: lcDifficulty },
    { moduleKind: "LEETCODE", dimension: "PATTERN", targets: lcPattern },
    {
      moduleKind: "SYSTEM_DESIGN",
      dimension: "TRACK",
      targets: Object.entries(systemTrackCounts).map(([bucketKey, targetCount]) => ({ bucketKey, targetCount })),
    },
  ];

  for (const entry of targetsToSet) {
    await replaceGoalTargetsForSeedUser(goalId, entry);
  }
}

async function run() {
  const removedItems = await removeExistingUberSeedItems();
  const deletedGoals = await deleteAllGoals();

  const leetcodeIds = await upsertLeetcode();
  const systemIdsByTrack = await upsertSystemDesign();
  const systemIds = [
    ...systemIdsByTrack["backend-core"],
    ...systemIdsByTrack["genai-backend-orchestration"],
    ...systemIdsByTrack["genai-frontend-lld"],
    ...systemIdsByTrack["distributed-systems"],
  ];
  systemIdsHint = new Set(systemIds);

  const goal = await createGoal(leetcodeIds.length, systemIds.length);
  const linked = await addItemsToGoal(goal.id, [...leetcodeIds, ...systemIds]);

  await setGoalTargets(goal.id, LEETCODE_BANK, {
    "backend-core": systemIdsByTrack["backend-core"].length,
    "genai-backend-orchestration": systemIdsByTrack["genai-backend-orchestration"].length,
    "genai-frontend-lld": systemIdsByTrack["genai-frontend-lld"].length,
    "distributed-systems": systemIdsByTrack["distributed-systems"].length,
  });

  console.log("Uber 60-day goal reset + seed complete");
  console.log(`Removed prior uber seed items: ${removedItems.deleted}/${removedItems.count}`);
  console.log(`Deleted old goals: ${deletedGoals}`);
  console.log(`LeetCode bank items: ${leetcodeIds.length}`);
  console.log(`System design items: ${systemIds.length}`);
  console.log(`Goal created: ${goal.name} (${goal.id})`);
  console.log(`Goal items linked: ${linked}`);
  console.log(
    `System tracks: backend-core=${systemIdsByTrack["backend-core"].length}, genai-backend-orchestration=${systemIdsByTrack["genai-backend-orchestration"].length}, genai-frontend-lld=${systemIdsByTrack["genai-frontend-lld"].length}, distributed-systems=${systemIdsByTrack["distributed-systems"].length}`
  );
}

let systemIdsHint = new Set();

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSql();
  });
