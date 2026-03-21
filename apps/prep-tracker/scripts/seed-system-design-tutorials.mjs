#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import { closeSql, createSharedContentItem, listSharedContentItems, updateSharedContentItem } from "./lib/shared-content-store.mjs";
import { addGoalItemForSeedUser, listGoalsForSeedUser } from "./lib/goal-admin-store.mjs";

const DEFAULT_TUTOR_ROOT = "/Users/rishabhbansal/Desktop/source/journey/py-tutor/system-design";
const TUTOR_ROOT = process.env.PY_TUTOR_SYSTEM_DESIGN_ROOT || DEFAULT_TUTOR_ROOT;

const TUTORIALS = [
  {
    title: "Tutorial: Distributed Systems Course Outline",
    relativePath: "distributed-systems/course-outline.md",
    concept: "Foundations",
    level: "EASY",
  },
  {
    title: "Tutorial: DDIA Twitter Learning Path",
    relativePath: "case-studies/ddia-learning-path.md",
    concept: "Data Platform & Storage",
    level: "EASY",
  },
  {
    title: "Tutorial: Logs Transport Evolution",
    relativePath: "case-studies/logs-transport-evolution/README.md",
    concept: "Data Platform & Storage",
    level: "MEDIUM",
  },
  {
    title: "Tutorial: Database Internals - Indexes and Concurrency",
    relativePath: "databases/deep-dive-indexes-concurrency.md",
    concept: "Foundations",
    level: "MEDIUM",
  },
  {
    title: "Tutorial: Consistent Hashing Deep Dive",
    relativePath: "distributed-systems/deep-dive-consistent-hashing.md",
    concept: "Data Platform & Storage",
    level: "MEDIUM",
  },
  {
    title: "Tutorial: Sidecar Pattern Deep Dive",
    relativePath: "distributed-systems/deep-dive-sidecar-pattern.md",
    concept: "Experimentation & Platform",
    level: "MEDIUM",
  },
  {
    title: "Tutorial: Sagas and Long-Lived Transactions",
    relativePath: "distributed-systems/concluding-distributed-transactions/Lesson_2.md",
    concept: "Payments & Reliability",
    level: "MEDIUM",
  },
];

function slugify(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function run() {
  const existing = await listSharedContentItems({ type: "SYSTEM_DESIGN", includeDeleted: true });
  const byTitle = new Map(existing.map((item) => [String(item.title).toLowerCase(), item]));

  let created = 0;
  let updated = 0;
  const upsertedIds = [];
  const missingFiles = [];

  for (const tutorial of TUTORIALS) {
    const fullPath = path.join(TUTOR_ROOT, tutorial.relativePath);
    const exists = existsSync(fullPath);
    if (!exists) {
      missingFiles.push(fullPath);
    }

    const tags = [
      "system-design",
      "tutorial",
      "py-tutor",
      "source:local-tutorial",
      `sd-concept:${slugify(tutorial.concept)}`,
      `sd-level:${tutorial.level.toLowerCase()}`,
      "track:tutorial-setup",
    ];

    const notesMarkdown =
      `# ${tutorial.title}\n\n` +
      `## Tutorial path\n` +
      `- Local file: \`${fullPath}\`\n` +
      `- Exists on disk: ${exists ? "yes" : "no"}\n\n` +
      `## Suggested use\n` +
      `- Read and take summary notes.\n` +
      `- Add 3 interview-style tradeoffs.\n` +
      `- Add one follow-up design prompt from this topic.\n`;

    const metadata = {
      source: "local-py-tutor",
      tutorialPath: fullPath,
      tutorialExists: exists,
      sdConcept: tutorial.concept,
      sdLevel: tutorial.level,
      sdTrack: "tutorial-setup",
      seededAt: new Date().toISOString(),
    };

    const current = byTitle.get(tutorial.title.toLowerCase()) ?? null;

    if (!current) {
      const payload = {
        title: tutorial.title,
        type: "SYSTEM_DESIGN",
        systemTopic: slugify(tutorial.title),
        notesMarkdown,
        tags,
        links: [],
        shouldReviewAgain: true,
        reviewIntervalDays: 7,
        metadata,
      };
      const createdItem = await createSharedContentItem(payload);
      created += 1;
      upsertedIds.push(createdItem.id);
      continue;
    }

    const updatedItem = await updateSharedContentItem(current.id, {
      tags: unique([...(current.tags ?? []), ...tags]),
      metadata: { ...(current.metadata ?? {}), ...metadata },
      notesMarkdown: current.notesMarkdown?.trim() ? current.notesMarkdown : notesMarkdown,
    });
    if (!updatedItem) {
      throw new Error(`Update failed for "${tutorial.title}"`);
    }
    updated += 1;
    upsertedIds.push(current.id);
  }

  const goals = (await listGoalsForSeedUser()).filter((goal) => String(goal.name).toLowerCase().includes("uber prep"));
  let goalLinks = 0;
  for (const goal of goals) {
    for (const itemId of upsertedIds) {
      await addGoalItemForSeedUser(goal.id, itemId, "SYSTEM_DESIGN");
      goalLinks += 1;
    }
  }

  console.log("Tutorial setup seeding complete");
  console.log(`Tutorial entries: ${TUTORIALS.length}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Goal links attempted: ${goalLinks}`);
  if (missingFiles.length > 0) {
    console.log("Missing tutorial files:");
    for (const file of missingFiles) {
      console.log(`- ${file}`);
    }
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSql();
  });
