#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  closeSql,
  createSharedContentItem,
  listSharedContentItems,
  restoreSharedContentItem,
  softDeleteSharedContentItem,
  updateSharedContentItem,
} from "./lib/shared-content-store.mjs";

const INPUT_FILE =
  process.env.UBER_RANKED_LINKS_FILE || path.join(process.cwd(), "data", "imports", "uber-ranked-slugs-2026-03-13.json");
const PERIODS = ["thirty-days", "three-months", "six-months"];

function normalizeSlug(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return "";

  if (!value.includes("/")) {
    return value
      .toLowerCase()
      .replace(/^\/+|\/+$/g, "");
  }

  try {
    const url = new URL(value);
    const match = url.pathname.toLowerCase().match(/\/problems\/([^/]+)/);
    return match?.[1] ?? "";
  } catch {
    const match = value.toLowerCase().match(/problems\/([^/?#]+)/);
    return match?.[1] ?? "";
  }
}

function canonicalProblemUrl(slug) {
  return `https://leetcode.com/problems/${slug}/`;
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

function slugToTitle(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 3) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function patternTag(pattern) {
  return String(pattern ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function scoreForIndex(index) {
  return Math.max(1, 100 - index);
}

function metadataSource(item) {
  const metadata = item?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return typeof metadata.source === "string" ? metadata.source : null;
}

function companyFrequenciesWithUber(existing, uberScore) {
  const rows = Array.isArray(existing) ? existing : [];
  const merged = [];
  const seen = new Set();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (key === "uber") continue;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ name, score: Number(row.score ?? 0) || 0 });
  }

  merged.unshift({ name: "Uber", score: uberScore });
  return merged;
}

async function loadInput() {
  const raw = await readFile(INPUT_FILE, "utf8");
  const json = JSON.parse(raw);
  const periods = json?.periods && typeof json.periods === "object" ? json.periods : json;
  return periods;
}

function buildRankedProblems(periods) {
  const bySlug = new Map();

  for (const period of PERIODS) {
    const entries = Array.isArray(periods?.[period]) ? periods[period] : [];
    entries.forEach((entry, index) => {
      const slug = normalizeSlug(entry);
      if (!slug) return;

      const current = bySlug.get(slug) ?? {
        slug,
        link: canonicalProblemUrl(slug),
        frequencies: {},
      };
      current.frequencies[period] = scoreForIndex(index);
      bySlug.set(slug, current);
    });
  }

  const allOrder = [];
  const seen = new Set();
  for (const period of PERIODS) {
    const entries = Array.isArray(periods?.[period]) ? periods[period] : [];
    for (const entry of entries) {
      const slug = normalizeSlug(entry);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      allOrder.push(slug);
    }
  }

  allOrder.forEach((slug, index) => {
    const current = bySlug.get(slug);
    if (!current) return;
    current.frequencies.all = scoreForIndex(index);
  });

  return {
    problems: allOrder.map((slug) => bySlug.get(slug)).filter(Boolean),
    totals: Object.fromEntries(PERIODS.map((period) => [period, Array.isArray(periods?.[period]) ? periods[period].length : 0])),
  };
}

async function main() {
  const periods = await loadInput();
  const { problems, totals } = buildRankedProblems(periods);
  const now = new Date().toISOString();

  if (problems.length === 0) {
    throw new Error(`No ranked problems found in ${INPUT_FILE}`);
  }

  console.log("Loading current shared LeetCode bank from Supabase...");
  const existingItems = await listSharedContentItems({ type: "LEETCODE", includeDeleted: true });
  const bySlug = new Map();
  const byUrl = new Map();
  for (const item of existingItems) {
    const slug = normalizeSlug(item.problemSlug);
    const url = normalizeUrl(item.problemLink);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, item);
    if (url && !byUrl.has(url)) byUrl.set(url, item);
  }

  let created = 0;
  let updated = 0;
  let restored = 0;
  let deleted = 0;
  let failed = 0;

  const targetSlugs = new Set(problems.map((problem) => problem.slug));

  for (const problem of problems) {
    const existing = bySlug.get(problem.slug) ?? byUrl.get(normalizeUrl(problem.link)) ?? null;
    const existingMetadata =
      existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? existing.metadata
        : {};
    const existingLww =
      existingMetadata.leetcodeWizard && typeof existingMetadata.leetcodeWizard === "object" && !Array.isArray(existingMetadata.leetcodeWizard)
        ? existingMetadata.leetcodeWizard
        : {};

    const difficulty = typeof existing?.difficulty === "string" && existing.difficulty.trim() ? existing.difficulty.trim() : null;
    const pattern = typeof existing?.pattern === "string" && existing.pattern.trim() ? existing.pattern.trim() : null;
    const previousTags = Array.isArray(existing?.tags)
      ? existing.tags.filter(
          (tag) =>
            !String(tag).toLowerCase().startsWith("difficulty:") &&
            !String(tag).toLowerCase().startsWith("pattern:")
        )
      : [];
    const tags = dedupeStrings([
      ...previousTags,
      "leetcode",
      "uber",
      "company:uber",
      "source:leetcodewizard",
      difficulty ? `difficulty:${difficulty.toLowerCase()}` : "",
      pattern ? `pattern:${patternTag(pattern)}` : "",
    ]).map((tag) => tag.toLowerCase());

    const links = dedupeStrings([problem.link, ...(Array.isArray(existing?.links) ? existing.links.map((entry) => entry.url) : [])]).map(
      (url, index) => ({
        id: existing?.links?.find((entry) => entry.url === url)?.id,
        label: index === 0 ? "Problem" : "Reference",
        url,
      })
    );

    const metadata = {
      ...existingMetadata,
      source: "leetcodewizard",
      lastIngestedAt: now,
      companyFrequency: companyFrequenciesWithUber(existingMetadata.companyFrequency, problem.frequencies.all),
      uberFrequencyImport: {
        importedAt: now,
        sourceFile: path.basename(INPUT_FILE),
      },
      leetcodeWizard: {
        ...existingLww,
        fetchedAt: now,
        companyId: "uber",
        frequencies: problem.frequencies,
        rankedBy: "manual-link-order",
      },
    };

    const payload = {
      title: typeof existing?.title === "string" && existing.title.trim() ? existing.title : slugToTitle(problem.slug),
      notesMarkdown:
        (typeof existing?.notesMarkdown === "string" && existing.notesMarkdown.trim()) ||
        `# ${slugToTitle(problem.slug)}\n\n- Source: Manual Uber ranked import\n`,
      tags,
      links,
      platform: "LeetCode",
      problemLink: problem.link,
      problemSlug: problem.slug,
      difficulty,
      pattern,
      metadata,
    };

    try {
      if (existing) {
        if (existing.deletedAt) {
          const restoredItem = await restoreSharedContentItem(existing.id);
          if (!restoredItem) {
            failed += 1;
            console.error(`Restore failed for ${problem.slug}`);
            continue;
          }
          restored += 1;
        }

        const updatedItem = await updateSharedContentItem(existing.id, payload);
        if (!updatedItem) {
          failed += 1;
          console.error(`Patch failed for ${problem.slug}`);
          continue;
        }

        updated += 1;
      } else {
        await createSharedContentItem({
          ...payload,
          type: "LEETCODE",
          shouldReviewAgain: true,
          reviewIntervalDays: 7,
          attemptCount: 0,
          leetcodeOutcome: "TODO",
        });

        created += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`Upsert failed for ${problem.slug}:`, error instanceof Error ? error.message : String(error));
    }
  }

  for (const item of existingItems) {
    if (metadataSource(item) !== "leetcodewizard") continue;
    const slug = normalizeSlug(item.problemSlug || item.problemLink);
    if (!slug || targetSlugs.has(slug) || item.deletedAt) continue;

    try {
      const deletedItem = await softDeleteSharedContentItem(item.id);
      if (!deletedItem?.deletedAt) {
        failed += 1;
        console.error(`Delete failed for stale item ${slug}`);
        continue;
      }
      deleted += 1;
    } catch (error) {
      failed += 1;
      console.error(`Delete failed for stale item ${slug}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log("");
  console.log("Uber ranked import complete");
  console.log(`- source file: ${INPUT_FILE}`);
  console.log(`- target problems: ${problems.length}`);
  console.log(`- 30d / 3m / 6m counts: ${totals["thirty-days"]} / ${totals["three-months"]} / ${totals["six-months"]}`);
  console.log(`- created: ${created}`);
  console.log(`- updated: ${updated}`);
  console.log(`- restored: ${restored}`);
  console.log(`- soft-deleted stale leetcodewizard items: ${deleted}`);
  console.log(`- failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSql();
  });
