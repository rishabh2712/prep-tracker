#!/usr/bin/env node

import { closeSql, createSharedContentItem, listSharedContentItems, updateSharedContentItem } from "./lib/shared-content-store.mjs";
import { addGoalItemForSeedUser, listGoalsForSeedUser } from "./lib/goal-admin-store.mjs";

const SOURCES = {
  systemDesignPrimer: "https://github.com/donnemartin/system-design-primer",
  sid24: "https://github.com/sid24rane/system-design-interview-questions",
  checkcheckzz: "https://github.com/checkcheckzz/system-design-interview",
  uberInterview: "https://interviewing.io/learn/system-design/interview-questions/uber-system-design-interview-questions",
  uberH3: "https://eng.uber.com/h3/",
  uberGeofence: "https://www.uber.com/en-IN/blog/go-geofence-high-precision-maps/",
  openaiRag: "https://cookbook.openai.com/examples/question_answering_using_embeddings",
  anthropicAgents: "https://www.anthropic.com/engineering/building-effective-agents",
  langgraph: "https://langchain-ai.github.io/langgraph/",
  googleAgentic: "https://cloud.google.com/architecture/choose-design-pattern-agentic-ai-system",
  azureRag: "https://learn.microsoft.com/en-us/azure/developer/ai/advanced-retrieval-augmented-generation",
};

const QUESTIONS = [
  {
    title: "Design API Rate Limiter",
    concept: "Foundations",
    level: "EASY",
    track: "general",
    sources: [SOURCES.systemDesignPrimer, SOURCES.sid24],
  },
  {
    title: "Design Notification Service",
    concept: "Realtime Communication",
    level: "EASY",
    track: "general",
    sources: [SOURCES.systemDesignPrimer, SOURCES.checkcheckzz],
  },
  {
    title: "Design Search Autocomplete",
    concept: "Search & Discovery",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.systemDesignPrimer, SOURCES.sid24],
  },
  {
    title: "Design Web Crawler",
    concept: "Data Platform & Storage",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.systemDesignPrimer],
  },
  {
    title: "Design Chat Messaging Service",
    concept: "Realtime Communication",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.systemDesignPrimer, SOURCES.checkcheckzz],
  },
  {
    title: "Design News Feed",
    concept: "Data Platform & Storage",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.systemDesignPrimer, SOURCES.checkcheckzz],
  },
  {
    title: "Design Distributed Cache",
    concept: "Foundations",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.sid24],
  },
  {
    title: "Design File Storage Service",
    concept: "Data Platform & Storage",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.systemDesignPrimer],
  },
  {
    title: "Design Video Streaming Platform",
    concept: "Data Platform & Storage",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.systemDesignPrimer],
  },
  {
    title: "Design Metrics and Alerting Platform",
    concept: "Experimentation & Platform",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.sid24],
  },
  {
    title: "Design Job Scheduler",
    concept: "Experimentation & Platform",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.checkcheckzz],
  },
  {
    title: "Design Real-time Analytics Pipeline",
    concept: "Data Platform & Storage",
    level: "MEDIUM",
    track: "general",
    sources: [SOURCES.checkcheckzz],
  },

  {
    title: "Design Trip State Machine Service",
    concept: "Matching & Dispatch",
    level: "MEDIUM",
    track: "uber",
    sources: [SOURCES.uberInterview],
  },
  {
    title: "Design Marketplace Matching Ranker",
    concept: "Matching & Dispatch",
    level: "MEDIUM",
    track: "uber",
    sources: [SOURCES.uberInterview],
  },
  {
    title: "Design Driver Supply-Demand Forecasting Service",
    concept: "Marketplace & Pricing",
    level: "MEDIUM",
    track: "uber",
    sources: [SOURCES.uberInterview],
  },
  {
    title: "Design City-Scale Hexagonal Geospatial Index",
    concept: "Geo, ETA & Routing",
    level: "MEDIUM",
    track: "uber",
    sources: [SOURCES.uberH3, SOURCES.uberGeofence],
  },
  {
    title: "Design Rider Fraud and Abuse Detection Pipeline",
    concept: "Trust, Safety & Feedback",
    level: "MEDIUM",
    track: "uber",
    sources: [SOURCES.uberInterview],
  },

  {
    title: "Design Enterprise RAG Platform",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.openaiRag, SOURCES.azureRag],
  },
  {
    title: "Design Embedding Ingestion and Index Refresh Pipeline",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.openaiRag, SOURCES.azureRag],
  },
  {
    title: "Design LLM Gateway with Model Routing and Cost Controls",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.anthropicAgents, SOURCES.googleAgentic],
  },
  {
    title: "Design Agent Tool-Calling Runtime",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.anthropicAgents, SOURCES.langgraph],
  },
  {
    title: "Design Multi-Agent Orchestration Platform",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.anthropicAgents, SOURCES.langgraph, SOURCES.googleAgentic],
  },
  {
    title: "Design Semantic Cache for LLM Responses",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.openaiRag],
  },
  {
    title: "Design Prompt Management and Evaluation Platform",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.anthropicAgents, SOURCES.langgraph],
  },
  {
    title: "Design LLM and Agent Observability Platform",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.anthropicAgents, SOURCES.googleAgentic],
  },
  {
    title: "Design Conversation Memory Store for Agents",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.anthropicAgents, SOURCES.langgraph],
  },
  {
    title: "Design Guardrails and Policy Enforcement for GenAI",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.googleAgentic, SOURCES.anthropicAgents],
  },
  {
    title: "Design Real-Time Token Streaming Chat Backend",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.anthropicAgents, SOURCES.langgraph],
  },
  {
    title: "Design Retrieval Re-ranking Service for Knowledge Assistants",
    concept: "AI / GenAI Systems",
    level: "MEDIUM",
    track: "ai-genai",
    sources: [SOURCES.openaiRag, SOURCES.azureRag],
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

function toLinks(urls) {
  return urls.map((url, idx) => ({ label: `Reference ${idx + 1}`, url }));
}

async function run() {
  const existing = await listSharedContentItems({ type: "SYSTEM_DESIGN", includeDeleted: true });
  const byTitle = new Map(existing.map((item) => [String(item.title).toLowerCase(), item]));

  const upserted = [];
  let created = 0;
  let updated = 0;

  for (const q of QUESTIONS) {
    const titleKey = q.title.toLowerCase();
    const current = byTitle.get(titleKey) ?? null;
    const conceptSlug = slugify(q.concept);
    const tags = unique([
      "system-design",
      "interview-question",
      "source:web-research",
      `sd-concept:${conceptSlug}`,
      `sd-level:${q.level.toLowerCase()}`,
      `track:${q.track}`,
      q.track === "ai-genai" ? "ai-genai" : "",
      q.track === "ai-genai" ? "llm" : "",
      q.track === "ai-genai" ? "agents" : "",
      q.track === "uber" ? "uber" : "",
    ]);

    const metadata = {
      source: "web-research-seed",
      seededAt: new Date().toISOString(),
      sdConcept: q.concept,
      sdLevel: q.level,
      sdTrack: q.track,
      sourceUrls: q.sources,
    };

    const notesMarkdown =
      `# ${q.title}\n\n` +
      `## Interview framing\n` +
      `- Concept group: ${q.concept}\n` +
      `- Expected depth: ${q.level}\n` +
      `- Focus on requirements, bottlenecks, and tradeoffs.\n\n` +
      `## Checklist\n` +
      `- Functional + NFRs\n` +
      `- Capacity and bottleneck estimation\n` +
      `- Data model + APIs\n` +
      `- Failure modes and mitigation\n` +
      `- Cost and operations\n`;

    if (!current) {
      const payload = {
        title: q.title,
        type: "SYSTEM_DESIGN",
        systemTopic: slugify(q.title),
        notesMarkdown,
        tags,
        links: toLinks(q.sources),
        shouldReviewAgain: true,
        reviewIntervalDays: 7,
        metadata,
      };
      const createdItem = await createSharedContentItem(payload);
      created += 1;
      upserted.push(createdItem.id);
      continue;
    }

    const patchPayload = {
      tags: unique([...(current.tags ?? []), ...tags]),
      links: unique([...(current.links ?? []).map((l) => JSON.stringify(l)), ...toLinks(q.sources).map((l) => JSON.stringify(l))]).map((raw) => JSON.parse(raw)),
      metadata: { ...(current.metadata ?? {}), ...metadata },
      notesMarkdown: current.notesMarkdown?.trim() ? current.notesMarkdown : notesMarkdown,
    };
    const updatedItem = await updateSharedContentItem(current.id, patchPayload);
    if (!updatedItem) {
      throw new Error(`Failed updating "${q.title}"`);
    }
    updated += 1;
    upserted.push(current.id);
  }

  const goals = (await listGoalsForSeedUser()).filter((goal) => String(goal.name).toLowerCase().includes("uber prep"));
  let goalLinks = 0;
  for (const goal of goals) {
    for (const itemId of upserted) {
      await addGoalItemForSeedUser(goal.id, itemId, "SYSTEM_DESIGN");
      goalLinks += 1;
    }
  }

  console.log("System design web-research seeding complete");
  console.log(`Question set size: ${QUESTIONS.length}`);
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
