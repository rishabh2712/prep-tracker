#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  closeSql,
  createSharedContentItem,
  DuplicateContentError,
  getSharedContentItem,
  listSharedContentItems,
  restoreSharedContentItem,
  updateSharedContentItem,
} from "./lib/shared-content-store.mjs";

const manifestPath = path.join(process.cwd(), "data/frontend-bank/uber-frontend-bank.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/\s+/g, " ");
}

function titleKey(type, title) {
  return `${type}:${normalize(title)}`;
}

function leetcodeKeyFromItem(item) {
  if (item.problemSlug) return `slug:${normalize(item.problemSlug)}`;
  if (item.problemLink) return `url:${normalize(item.problemLink)}`;
  return `title:${normalize(item.title)}`;
}

function frontendMetadata(entry) {
  return {
    surface: manifest.surface,
    frontendTab: entry.frontendTab,
    entryKind: entry.entryKind,
    conceptCluster: entry.conceptCluster,
    roundTag: entry.roundTag,
    priority: entry.priority,
    seedKey: entry.seedKey,
    bankId: entry.bankId,
    sourceRefs: entry.sourceRefs.map((id) => manifest.sources[id]).filter(Boolean),
    timebox: entry.timebox,
    difficulty: entry.difficulty,
    level: entry.level,
    whyItMatters: entry.whyItMatters,
    expectedShape: entry.expectedShape,
    studyGuideMarkdown: entry.studyGuideMarkdown ?? null,
    reportedContext: entry.reportedContext ?? null,
    reportedPrompt: entry.reportedPrompt ?? null,
    practicePrompt: entry.practicePrompt ?? null,
  };
}

function mergeTags(existing, next) {
  return Array.from(new Set([...(existing ?? []), ...(next ?? [])]));
}

function mergeLinks(existing, next) {
  const map = new Map();
  for (const link of [...(existing ?? []), ...(next ?? [])]) {
    if (!link?.url) continue;
    map.set(link.url, { label: link.label ?? link.url, url: link.url, id: link.id });
  }
  return Array.from(map.values()).map((link) => ({ label: link.label, url: link.url, id: link.id }));
}

async function restoreIfDeleted(item) {
  if (!item?.deletedAt) return item;
  const restored = await restoreSharedContentItem(item.id);
  if (!restored) {
    throw new Error(`Failed to restore deleted item ${item.id}`);
  }
  return restored;
}

function shouldClearSchedule(item) {
  return !item.lastReviewedAt && !item.lastSolvedAt;
}

function buildCreatePayload(entry) {
  const payload = {
    title: entry.title,
    type: entry.type,
    notesMarkdown: entry.notesMarkdown,
    tags: entry.tags,
    links: entry.links,
    shouldReviewAgain: true,
    reviewIntervalDays: 7,
    metadata: frontendMetadata(entry),
  };

  if (entry.type === "LEETCODE") {
    payload.platform = entry.platform ?? "LeetCode";
    payload.problemLink = entry.problemLink ?? null;
    payload.problemSlug = entry.problemSlug ?? null;
    payload.pattern = entry.pattern ?? null;
    payload.difficulty = entry.difficulty ?? null;
    payload.leetcodeOutcome = entry.leetcodeOutcome ?? "TODO";
  }

  if (entry.type === "SYSTEM_DESIGN" || entry.type === "LLD") {
    payload.systemTopic = entry.systemTopic ?? entry.title;
  }

  return payload;
}

function buildPatchPayload(existing, entry) {
  const metadata = {
    ...(existing.metadata ?? {}),
    ...frontendMetadata(entry),
  };

  const patch = {
    tags: mergeTags(existing.tags, entry.tags),
    links: mergeLinks(existing.links, entry.links),
    metadata,
  };

  if (!String(existing.notesMarkdown ?? "").trim()) {
    patch.notesMarkdown = entry.notesMarkdown;
  }

  if (entry.type === "LEETCODE") {
    if (!existing.platform) patch.platform = entry.platform ?? "LeetCode";
    if (!existing.problemLink && entry.problemLink) patch.problemLink = entry.problemLink;
    if (!existing.problemSlug && entry.problemSlug) patch.problemSlug = entry.problemSlug;
    if (!existing.pattern && entry.pattern) patch.pattern = entry.pattern;
    if (!existing.difficulty && entry.difficulty) patch.difficulty = entry.difficulty;
  }

  if (entry.type === "SYSTEM_DESIGN" || entry.type === "LLD") {
    if (!existing.systemTopic) patch.systemTopic = entry.systemTopic ?? entry.title;
  }

  if (shouldClearSchedule(existing) && existing.nextReviewAt) {
    patch.nextReviewAt = null;
  }

  return patch;
}

function reindex(items) {
  const bySeedKey = new Map();
  const byTypeTitle = new Map();
  const byLeetcode = new Map();

  for (const item of items) {
    const metadata = item.metadata ?? {};
    if (metadata.surface === manifest.surface && typeof metadata.seedKey === "string") {
      bySeedKey.set(metadata.seedKey, item);
    }
    byTypeTitle.set(titleKey(item.type, item.title), item);
    if (item.type === "LEETCODE") {
      byLeetcode.set(leetcodeKeyFromItem(item), item);
      if (item.problemSlug) byLeetcode.set(`slug:${normalize(item.problemSlug)}`, item);
      byLeetcode.set(`title:${normalize(item.title)}`, item);
    }
  }

  return { bySeedKey, byTypeTitle, byLeetcode };
}

async function run() {
  const items = await listSharedContentItems({ type: "ALL", includeDeleted: true });
  const counts = { created: 0, updated: 0, reused: 0, patchedSchedule: 0 };

  for (const entry of manifest.entries) {
    const { bySeedKey, byTypeTitle, byLeetcode } = reindex(items);
    let existing = bySeedKey.get(entry.seedKey) ?? null;

    if (!existing && entry.type === "LEETCODE") {
      const slugKey = entry.problemSlug ? `slug:${normalize(entry.problemSlug)}` : null;
      existing = (slugKey ? byLeetcode.get(slugKey) : null) ?? byLeetcode.get(`title:${normalize(entry.title)}`) ?? null;
    }

    if (!existing) {
      existing = byTypeTitle.get(titleKey(entry.type, entry.title)) ?? null;
    }

    if (!existing) {
      try {
        existing = await createSharedContentItem(buildCreatePayload(entry));
        items.push(existing);
        counts.created += 1;
      } catch (error) {
        if (!(error instanceof DuplicateContentError)) {
          throw error;
        }
        existing = items.find((item) => item.id === error.existingId) ?? (await getSharedContentItem(error.existingId));
        if (!existing) {
          throw new Error(`Unable to recover duplicate item for ${entry.seedKey}`);
        }
      }
    }

    existing = await restoreIfDeleted(existing);
    const existingIndex = items.findIndex((item) => item.id === existing.id);
    if (existingIndex >= 0) items[existingIndex] = existing;
    else items.push(existing);

    const patch = buildPatchPayload(existing, entry);
    const shouldPatch = Object.keys(patch).length > 0;

    if (shouldPatch) {
      const updatedItem = await updateSharedContentItem(existing.id, patch);
      if (!updatedItem) {
        throw new Error(`Failed to update ${entry.seedKey}`);
      }

      const index = items.findIndex((item) => item.id === existing.id);
      if (index >= 0) items[index] = updatedItem;
      else items.push(updatedItem);
      counts.updated += 1;
      if (patch.nextReviewAt === null) counts.patchedSchedule += 1;
    } else {
      counts.reused += 1;
    }
  }

  console.log(`Seeded frontend bank from ${manifest.entries.length} entries`);
  console.log(`- created: ${counts.created}`);
  console.log(`- updated: ${counts.updated}`);
  console.log(`- reused without patch: ${counts.reused}`);
  console.log(`- schedules cleared: ${counts.patchedSchedule}`);
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSql();
  });
