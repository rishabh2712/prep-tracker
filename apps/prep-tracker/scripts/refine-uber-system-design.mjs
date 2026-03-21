#!/usr/bin/env node

import { closeSql, createSharedContentItem, listSharedContentItems, updateSharedContentItem } from "./lib/shared-content-store.mjs";
import { addGoalItemForSeedUser, listGoalsForSeedUser } from "./lib/goal-admin-store.mjs";

const CURATED_TOPICS = [
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
  const existingItems = await listSharedContentItems({ type: "SYSTEM_DESIGN", includeDeleted: true });
  const byTitle = new Map(existingItems.map((item) => [String(item.title).toLowerCase(), item]));

  const curatedIds = [];
  let created = 0;
  let updated = 0;

  for (const topic of CURATED_TOPICS) {
    const existing = byTitle.get(topic.title.toLowerCase()) ?? null;
    const conceptSlug = slugify(topic.concept);

    const desiredTags = [
      "system-design",
      "uber",
      `sd-level:${topic.level.toLowerCase()}`,
      `sd-concept:${conceptSlug}`,
      "sd-track:easy-medium",
    ];

    const desiredMetadata = {
      source: "uber-prep-seed",
      sdConcept: topic.concept,
      sdLevel: topic.level,
      sdTrack: "easy-medium",
      refinedAt: new Date().toISOString(),
    };

    if (!existing) {
      const payload = {
        title: topic.title,
        type: "SYSTEM_DESIGN",
        systemTopic: slugify(topic.title),
        notesMarkdown: `# ${topic.title}\n\n## Problem framing\n-\n\n## Requirements\n-\n\n## High-level design\n-\n\n## Tradeoffs\n-\n`,
        tags: desiredTags,
        links: [],
        shouldReviewAgain: true,
        reviewIntervalDays: 7,
        metadata: desiredMetadata,
      };

      const createdItem = await createSharedContentItem(payload);
      created += 1;
      curatedIds.push(createdItem.id);
      continue;
    }

    const patchPayload = {
      tags: unique([...(existing.tags ?? []), ...desiredTags]),
      metadata: {
        ...((existing.metadata ?? {})),
        ...desiredMetadata,
      },
    };

    const updatedItem = await updateSharedContentItem(existing.id, patchPayload);
    if (!updatedItem) {
      throw new Error(`Failed to update "${topic.title}"`);
    }

    updated += 1;
    curatedIds.push(existing.id);
  }

  const goals = (await listGoalsForSeedUser()).filter((goal) => String(goal.name).toLowerCase().includes("uber prep"));

  let goalLinks = 0;
  for (const goal of goals) {
    for (const id of curatedIds) {
      await addGoalItemForSeedUser(goal.id, id, "SYSTEM_DESIGN");
      goalLinks += 1;
    }
  }

  console.log("Uber SD refinement complete");
  console.log(`Curated topics: ${CURATED_TOPICS.length}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Goal links attempted: ${goalLinks}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSql();
  });
