#!/usr/bin/env node

import {
  closeSql,
  createSharedContentItem,
  DuplicateContentError,
  updateSharedContentItem,
} from "./lib/shared-content-store.mjs";
import {
  addGoalItemForSeedUser,
  createGoalForSeedUser,
  getGoalByNameForSeedUser,
  listGoalDaysForSeedUser,
  updateGoalDayForSeedUser,
  updateGoalForSeedUser,
} from "./lib/goal-admin-store.mjs";

const BASE = "https://raw.githubusercontent.com/liquidslr/interview-company-wise-problems/main";
const TIMEFRAME_FILE = "2. Three Months.csv";
const PRIORITY_FILE = "1. Thirty Days.csv";

const COMPANY_POOL = [
  "Uber",
  "Meta",
  "Google",
  "Amazon",
  "Microsoft",
  "Apple",
  "DoorDash",
  "Airbnb",
  "Netflix",
  "LinkedIn",
  "Bloomberg",
  "Databricks",
  "Adobe",
];

const SD_TOPICS = [
  { title: "Design Rider-Driver Notification Service", concept: "Realtime Communication", level: "EASY" },
  { title: "Design Rating and Feedback System", concept: "Trust, Safety & Feedback", level: "EASY" },
  { title: "Design Experimentation and Feature Flags", concept: "Experimentation & Platform", level: "EASY" },
  { title: "Design Driver ETA Service", concept: "Geo, ETA & Routing", level: "EASY" },

  { title: "Design Ride Matching Service", concept: "Matching & Dispatch", level: "MEDIUM" },
  { title: "Design Dispatch Queueing", concept: "Matching & Dispatch", level: "MEDIUM" },
  { title: "Design Real-Time Location Tracking", concept: "Geo, ETA & Routing", level: "MEDIUM" },
  { title: "Design GeoSpatial Index Service", concept: "Geo, ETA & Routing", level: "MEDIUM" },
  { title: "Design Dynamic Route Optimization", concept: "Geo, ETA & Routing", level: "MEDIUM" },
  { title: "Design Surge Pricing", concept: "Marketplace & Pricing", level: "MEDIUM" },
  { title: "Design Driver Incentive Engine", concept: "Marketplace & Pricing", level: "MEDIUM" },
  { title: "Design Idempotent Payment Processing", concept: "Payments & Reliability", level: "MEDIUM" },
  { title: "Design Trip Event Pipeline", concept: "Data Platform & Storage", level: "MEDIUM" },
  { title: "Design Trip History Storage", concept: "Data Platform & Storage", level: "MEDIUM" },
  { title: "Design Safety Incident Workflow", concept: "Trust, Safety & Feedback", level: "MEDIUM" },
];

function csvParse(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());

  return rows
    .slice(1)
    .filter((r) => r.some((value) => String(value).trim().length > 0))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}

async function fetchCompanyCsv(company, filename) {
  const url = `${BASE}/${encodeURIComponent(company)}/${encodeURIComponent(filename)}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  return csvParse(text);
}

function normalizeProblemLink(raw) {
  if (!raw) return "";
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${pathname}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

function topicPattern(topicsRaw) {
  const topics = String(topicsRaw ?? "").toLowerCase();

  if (topics.includes("sliding window")) return "Sliding Window";
  if (topics.includes("two pointers")) return "Two Pointers";
  if (topics.includes("binary search")) return "Binary Search";
  if (topics.includes("backtracking")) return "Backtracking";
  if (topics.includes("trie")) return "Tries";
  if (topics.includes("linked list") || topics.includes("doubly-linked")) return "Linked List";
  if (topics.includes("stack") || topics.includes("monotonic")) return "Stack";
  if (topics.includes("heap") || topics.includes("priority queue")) return "Heap / Priority Queue";
  if (topics.includes("graph") || topics.includes("topological") || topics.includes("union find")) {
    if (topics.includes("shortest path")) return "Advanced Graphs";
    return "Graphs";
  }
  if (topics.includes("tree")) return "Trees";
  if (topics.includes("greedy")) return "Greedy";
  if (topics.includes("interval")) return "Intervals";
  if (topics.includes("bit")) return "Bit Manipulation";
  if (topics.includes("math") || topics.includes("geometry")) return "Math & Geometry";
  if (topics.includes("dynamic programming")) {
    if (topics.includes("matrix") || topics.includes("grid")) return "2-D Dynamic Programming";
    return "1-D Dynamic Programming";
  }

  return "Arrays & Hashing";
}

function companyTag(name) {
  return `company:${name.toLowerCase().replace(/\s+/g, "-")}`;
}

function dedupeByKey(entries) {
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.key, entry);
  }
  return Array.from(map.values());
}

async function ensureGoal(goalName, startDate, endDate, lcTarget, sdTarget) {
  const existing = await getGoalByNameForSeedUser(goalName);
  if (existing) {
    await updateGoalForSeedUser(existing.id, {
      startDate,
      endDate,
      leetcodeTarget: lcTarget,
      systemDesignTarget: sdTarget,
      dailyMinutesTarget: 180,
      status: "ACTIVE",
    });
    return existing.id;
  }

  const created = await createGoalForSeedUser({
    name: goalName,
    description: "Auto-generated Uber interview prep plan",
    startDate,
    endDate,
    leetcodeTarget: lcTarget,
    systemDesignTarget: sdTarget,
    dailyMinutesTarget: 180,
    status: "ACTIVE",
  });
  return created.id;
}

function isoDateWithOffset(days) {
  const now = new Date();
  const next = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}

async function run() {
  console.log("Loading company datasets...");

  const companyProblems = new Map();

  for (const company of COMPANY_POOL) {
    const rows = await fetchCompanyCsv(company, TIMEFRAME_FILE);
    if (!rows) {
      console.log(`- Skipped ${company} (no ${TIMEFRAME_FILE})`);
      continue;
    }

    for (const row of rows) {
      const key = normalizeProblemLink(row.Link || row.link || "");
      if (!key) continue;

      const frequency = Number.parseFloat(String(row.Frequency || row.frequency || "0")) || 0;
      const title = row.Title || row.title || "";

      if (!companyProblems.has(key)) {
        companyProblems.set(key, {
          key,
          title,
          link: row.Link || row.link || "",
          difficulty: (row.Difficulty || row.difficulty || "Medium").toUpperCase(),
          topics: row.Topics || row.topics || "",
          byCompany: {},
        });
      }

      const entry = companyProblems.get(key);
      entry.byCompany[company] = Math.max(entry.byCompany[company] || 0, frequency);
    }

    console.log(`- ${company}: ${rows.length} rows`);
  }

  const uberThreeMonths = await fetchCompanyCsv("Uber", TIMEFRAME_FILE);
  const uberThirtyDays = await fetchCompanyCsv("Uber", PRIORITY_FILE);
  if (!uberThreeMonths || !uberThirtyDays) {
    throw new Error("Unable to fetch Uber CSV datasets");
  }

  const uberMerged = dedupeByKey(
    [...uberThirtyDays, ...uberThreeMonths]
      .map((row) => {
        const key = normalizeProblemLink(row.Link || row.link || "");
        if (!key) return null;

        const problem = companyProblems.get(key);
        if (!problem) return null;

        const companies = Object.entries(problem.byCompany)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([name, score]) => ({ name, score }));

        const uberScore = Number.parseFloat(String(row.Frequency || row.frequency || "0")) || 0;

        return {
          key,
          title: problem.title,
          link: problem.link,
          difficulty: problem.difficulty,
          topics: problem.topics,
          uberScore,
          companies,
          pattern: topicPattern(problem.topics),
        };
      })
      .filter(Boolean)
  )
    .sort((a, b) => b.uberScore - a.uberScore)
    .slice(0, 90);

  console.log(`Uber curated problems: ${uberMerged.length}`);

  const seeded = [];
  let createdCount = 0;
  let existingCount = 0;
  let failedCount = 0;

  for (const row of uberMerged) {
    const slug = row.link.split("/").filter(Boolean).pop() || null;
    const tags = [
      "leetcode",
      "uber",
      `difficulty:${row.difficulty.toLowerCase()}`,
      `pattern:${row.pattern.toLowerCase().replace(/\s+/g, "-")}`,
      ...row.companies.map((entry) => companyTag(entry.name)),
    ];

    const payload = {
      title: row.title,
      type: "LEETCODE",
      notesMarkdown:
        `# ${row.title}\n\n` +
        `- Pattern: ${row.pattern}\n` +
        `- Uber frequency score: ${row.uberScore}\n` +
        `- Mostly asked in: ${row.companies.map((entry) => `${entry.name} (${entry.score})`).join(", ")}\n` +
        `- Topics: ${row.topics}\n`,
      tags,
      links: [{ label: "Problem", url: row.link }],
      platform: "LeetCode",
      problemLink: row.link,
      problemSlug: slug,
      difficulty: row.difficulty.charAt(0) + row.difficulty.slice(1).toLowerCase(),
      pattern: row.pattern,
      shouldReviewAgain: true,
      reviewIntervalDays: 7,
      attemptCount: 0,
      leetcodeOutcome: "TODO",
      metadata: {
        source: "liquidslr/interview-company-wise-problems",
        timeframe: "Uber 30D + 3M",
        companyFrequency: row.companies,
      },
    };

    try {
      const createdItem = await createSharedContentItem(payload);
      createdCount += 1;
      seeded.push({ id: createdItem.id, ...row });
      continue;
    } catch (error) {
      if (error instanceof DuplicateContentError && error.existingId) {
        existingCount += 1;
        seeded.push({ id: error.existingId, ...row });
        continue;
      }
      failedCount += 1;
      console.log(`Failed: ${row.title} -> ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`LeetCode seeded. created=${createdCount} existing=${existingCount} failed=${failedCount}`);

  const sdSeeded = [];
  for (const topic of SD_TOPICS) {
    const conceptSlug = topic.concept.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const payload = {
      title: topic.title,
      type: "SYSTEM_DESIGN",
      systemTopic: topic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
      notesMarkdown: `# ${topic.title}\n\n## Requirements\n-\n\n## Capacity\n-\n\n## Design\n-\n\n## Tradeoffs\n-\n`,
      tags: ["system-design", "uber", `sd-level:${topic.level.toLowerCase()}`, `sd-concept:${conceptSlug}`, "sd-track:easy-medium"],
      links: [],
      shouldReviewAgain: true,
      reviewIntervalDays: 7,
      metadata: {
        source: "uber-prep-seed",
        sdLevel: topic.level,
        sdConcept: topic.concept,
        sdTrack: "easy-medium",
      },
    };

    try {
      const createdItem = await createSharedContentItem(payload);
      sdSeeded.push({ id: createdItem.id, title: topic.title, level: topic.level, concept: topic.concept });
    } catch (error) {
      if (error instanceof DuplicateContentError && error.existingId) {
        sdSeeded.push({ id: error.existingId, title: topic.title, level: topic.level, concept: topic.concept });
        await updateSharedContentItem(error.existingId, {
          tags: payload.tags,
          metadata: payload.metadata,
        });
      } else {
        throw error;
      }
    }
  }

  console.log(`System design seeded/available: ${sdSeeded.length}`);

  const goalName = "Uber Prep 45D";
  const startDate = isoDateWithOffset(0);
  const endDate = isoDateWithOffset(44);
  const goalId = await ensureGoal(goalName, startDate, endDate, Math.min(90, seeded.length), Math.min(15, sdSeeded.length));

  let goalItemAdded = 0;
  for (const row of seeded.slice(0, 90)) {
    await addGoalItemForSeedUser(goalId, row.id, "LEETCODE");
    goalItemAdded += 1;
  }
  for (const row of sdSeeded.slice(0, 15)) {
    await addGoalItemForSeedUser(goalId, row.id, "SYSTEM_DESIGN");
    goalItemAdded += 1;
  }

  const days = (await listGoalDaysForSeedUser(goalId)).slice(0, 45);

  for (let i = 0; i < days.length; i += 1) {
    const day = days[i];
    const lc = seeded[i % seeded.length];
    const lc2 = seeded[(i * 3 + 7) % seeded.length];
    const sd = sdSeeded[Math.floor(i / 3) % sdSeeded.length];

    const notes = [
      `Plan:`,
      `LC1: ${lc.title} (${lc.pattern}, ${lc.difficulty})`,
      `LC2: ${lc2.title} (${lc2.pattern}, ${lc2.difficulty})`,
      `SD: ${sd.title}`,
      `Checklist: solve both LC, review one previous LC, read SD and write 5 tradeoffs.`,
    ].join("\n");

    await updateGoalDayForSeedUser(day.id, {
      plannedMinutes: 180,
      notes,
    });
  }

  console.log(`Goal ready: ${goalName} (${goalId})`);
  console.log(`Goal items linked: ${goalItemAdded}`);
  console.log(`Day plans updated: ${days.length}`);
  console.log(`Source: ${BASE}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSql();
  });
