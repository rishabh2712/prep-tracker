#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  closeSql,
  createSharedContentItem,
  DuplicateContentError,
  listSharedContentItems,
  restoreSharedContentItem,
  updateSharedContentItem,
} from "./lib/shared-content-store.mjs";

const COMPANY_ID = process.env.LEETCODE_WIZARD_UBER_COMPANY_ID || "c70adce6-2c42-47a5-b228-307035de4356";
const PERIODS = ["thirty-days", "three-months", "six-months", "more-than-six-months", "all"];
const PAGE_LIMIT = 100;
const API_BASE = "https://api.leetcodewizard.io/api/v1/problem-database/problems";

function normalizeSlug(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function normalizeUrl(raw) {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${pathname}`;
  } catch {
    return String(raw).trim().toLowerCase();
  }
}

function difficultyLabel(raw) {
  if (Number(raw) === 1) return "Easy";
  if (Number(raw) === 2) return "Medium";
  if (Number(raw) === 3) return "Hard";
  return "Medium";
}

function slugifyTag(raw) {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dedupeStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const item = String(value ?? "").trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function inferPattern(tags) {
  const lower = (tags ?? []).map((tag) => String(tag).toLowerCase().trim());
  const has = (needle) => lower.some((tag) => tag.includes(needle));
  const hasExact = (needle) => lower.some((tag) => tag === needle);

  if (has("sliding window")) return "Sliding Window";
  if (has("two pointers")) return "Two Pointers";
  if (has("backtracking")) return "Backtracking";
  if (has("trie")) return "Tries";
  if (has("tree")) return "Trees";
  if (hasExact("binary search")) return "Binary Search";
  if (has("linked list") || has("doubly-linked")) return "Linked List";
  if (has("stack") || has("monotonic")) return "Stack";
  if (has("heap") || has("priority queue")) return "Heap / Priority Queue";
  if (has("graph") || has("topological") || has("union find") || has("breadth-first") || has("depth-first")) {
    if (has("shortest path")) return "Advanced Graphs";
    return "Graphs";
  }
  if (has("greedy")) return "Greedy";
  if (has("interval")) return "Intervals";
  if (has("bit")) return "Bit Manipulation";
  if (has("math") || has("geometry")) return "Math & Geometry";
  if (has("dynamic programming")) {
    if (has("matrix") || has("grid")) return "2-D Dynamic Programming";
    return "1-D Dynamic Programming";
  }

  return "Arrays & Hashing";
}

function scoreFromFrequencies(frequencies) {
  if (typeof frequencies.all === "number") return frequencies.all;
  return Math.max(0, ...Object.values(frequencies).map((value) => Number(value) || 0));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "*/*",
      origin: "https://leetcodewizard.io",
      referer: "https://leetcodewizard.io/",
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}) for ${url}\n${body.slice(0, 500)}`);
  }

  return response.json();
}

async function fetchPeriod(period) {
  const merged = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = new URL(API_BASE);
    url.searchParams.set("company", COMPANY_ID);
    url.searchParams.set("timePeriod", period);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("sortBy", "frequency");
    url.searchParams.set("sortOrder", "desc");

    const json = await fetchJson(url.toString());
    const data = Array.isArray(json.data) ? json.data : [];
    merged.push(...data);

    const meta = json.meta ?? {};
    totalPages = Number(meta.totalPages ?? 1) || 1;
    page += 1;
  }

  return merged;
}

async function main() {
  const now = new Date().toISOString();
  const periodRows = {};
  const bySlug = new Map();

  console.log("Fetching LeetCodeWizard Uber dump...");
  for (const period of PERIODS) {
    const rows = await fetchPeriod(period);
    periodRows[period] = rows;
    console.log(`- ${period}: ${rows.length} rows`);

    for (const row of rows) {
      const slug = normalizeSlug(row.titleSlug);
      if (!slug) continue;

      const existing = bySlug.get(slug) ?? {
        slug,
        title: row.title,
        externalId: row.externalId ?? null,
        paidOnly: Boolean(row.paidOnly),
        difficultyRaw: row.difficulty,
        tags: [],
        frequencies: {},
      };

      existing.title = row.title || existing.title;
      existing.externalId = row.externalId ?? existing.externalId;
      existing.paidOnly = Boolean(row.paidOnly);
      existing.difficultyRaw = row.difficulty ?? existing.difficultyRaw;
      existing.tags = dedupeStrings([...(existing.tags ?? []), ...((row.tags ?? []).map((tag) => String(tag)))]);
      existing.frequencies[period] = Math.max(Number(existing.frequencies[period] ?? 0), Number(row.frequency ?? 0));
      bySlug.set(slug, existing);
    }
  }

  const mergedProblems = Array.from(bySlug.values())
    .map((row) => {
      const score = scoreFromFrequencies(row.frequencies);
      const difficulty = difficultyLabel(row.difficultyRaw);
      const pattern = inferPattern(row.tags);
      const link = `https://leetcode.com/problems/${row.slug}/`;

      return {
        ...row,
        score,
        difficulty,
        pattern,
        link,
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const dumpDir = path.join(process.cwd(), "data", "imports");
  await mkdir(dumpDir, { recursive: true });
  const dumpPath = path.join(dumpDir, `leetcodewizard-uber-${now.slice(0, 10)}.json`);
  await writeFile(
    dumpPath,
    JSON.stringify(
      {
        source: "leetcodewizard",
        companyId: COMPANY_ID,
        fetchedAt: now,
        periods: PERIODS,
        totals: Object.fromEntries(PERIODS.map((period) => [period, periodRows[period]?.length ?? 0])),
        mergedCount: mergedProblems.length,
        mergedProblems,
      },
      null,
      2
    )
  );
  console.log(`Raw dump saved: ${dumpPath}`);

  const existingItems = await listSharedContentItems({ type: "LEETCODE", includeDeleted: true });
  const byUrl = new Map();
  const byExistingSlug = new Map();

  for (const item of existingItems) {
    const canonicalUrl = normalizeUrl(item.problemLink);
    const slug = normalizeSlug(item.problemSlug);
    if (canonicalUrl) byUrl.set(canonicalUrl, item);
    if (slug) byExistingSlug.set(slug, item);
  }

  let created = 0;
  let updated = 0;
  let restored = 0;
  let failed = 0;

  for (const problem of mergedProblems) {
    const canonicalUrl = normalizeUrl(problem.link);
    const existing = byUrl.get(canonicalUrl) ?? byExistingSlug.get(problem.slug) ?? null;
    const score = Number(problem.score) || 0;
    const companyFrequency = [{ name: "Uber", score }];
    const baseTags = [
      "leetcode",
      "uber",
      "company:uber",
      "source:leetcodewizard",
      `difficulty:${problem.difficulty.toLowerCase()}`,
      `pattern:${slugifyTag(problem.pattern)}`,
    ];

    const previousTags = Array.isArray(existing?.tags) ? existing.tags : [];
    const tags = dedupeStrings([...previousTags, ...baseTags]).map((tag) => tag.toLowerCase());
    const existingMetadata =
      existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? existing.metadata
        : {};

    const metadata = {
      ...existingMetadata,
      source: "leetcodewizard",
      lastIngestedAt: now,
      companyFrequency: companyFrequency,
      leetcodeWizard: {
        companyId: COMPANY_ID,
        fetchedAt: now,
        externalId: problem.externalId,
        frequencies: problem.frequencies,
        tags: problem.tags,
        paidOnly: problem.paidOnly,
      },
    };

    const notesMarkdown =
      (existing?.notesMarkdown && String(existing.notesMarkdown).trim()) ||
      `# ${problem.title}\n\n- Difficulty: ${problem.difficulty}\n- Pattern: ${problem.pattern}\n- Source: LeetCodeWizard (Uber)\n`;

    const payload = {
      title: problem.title,
      notesMarkdown,
      tags,
      links: [{ label: "Problem", url: problem.link }],
      platform: "LeetCode",
      problemLink: problem.link,
      problemSlug: problem.slug,
      difficulty: problem.difficulty,
      pattern: problem.pattern,
      metadata,
    };

    try {
      if (existing) {
        if (existing.deletedAt) {
          const restoredItem = await restoreSharedContentItem(existing.id);
          if (restoredItem) restored += 1;
        }

        const patched = await updateSharedContentItem(existing.id, payload);
        if (!patched) {
          failed += 1;
          console.error(`Patch failed for ${problem.slug}`);
          continue;
        }
        updated += 1;
      } else {
        try {
          await createSharedContentItem({
            ...payload,
            type: "LEETCODE",
            shouldReviewAgain: true,
            reviewIntervalDays: 7,
            attemptCount: 0,
            leetcodeOutcome: "TODO",
          });
          created += 1;
        } catch (error) {
          if (error instanceof DuplicateContentError && error.existingId) {
            const retried = await updateSharedContentItem(error.existingId, payload);
            if (retried) {
              updated += 1;
              continue;
            }
          }
          failed += 1;
          console.error(`Create failed for ${problem.slug}:`, error instanceof Error ? error.message : String(error));
          continue;
        }
      }
    } catch (error) {
      failed += 1;
      console.error(`Upsert failed for ${problem.slug}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log("");
  console.log("LeetCodeWizard Uber import complete");
  console.log(`- merged problems: ${mergedProblems.length}`);
  console.log(`- created: ${created}`);
  console.log(`- updated: ${updated}`);
  console.log(`- restored: ${restored}`);
  console.log(`- failed: ${failed}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSql();
  });
