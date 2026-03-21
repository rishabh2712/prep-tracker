import type { PrepItem } from "@/lib/types";

export const SYSTEM_DESIGN_CONCEPTS = [
  "Foundations",
  "Distributed Systems Fundamentals",
  "Realtime Communication",
  "Matching & Dispatch",
  "Geo, ETA & Routing",
  "Marketplace & Pricing",
  "Data Platform & Storage",
  "Payments & Reliability",
  "Trust, Safety & Feedback",
  "Experimentation & Platform",
  "Search & Discovery",
  "AI / GenAI Systems",
] as const;

export type SystemDesignConcept = (typeof SYSTEM_DESIGN_CONCEPTS)[number] | "General";
export type SystemDesignLevel = "EASY" | "MEDIUM" | "HARD";

function normalizedSource(item: Pick<PrepItem, "title" | "systemTopic" | "tags">): string {
  return [item.title ?? "", item.systemTopic ?? "", ...(item.tags ?? [])].join(" ").toLowerCase();
}

function tagValue(tags: string[] | undefined, prefix: string): string | null {
  const value = (tags ?? [])
    .map((entry) => entry.trim())
    .find((entry) => entry.toLowerCase().startsWith(`${prefix.toLowerCase()}:`));
  if (!value) return null;
  return value.slice(prefix.length + 1).trim();
}

export function inferSystemDesignConcept(item: Pick<PrepItem, "title" | "systemTopic" | "tags">): SystemDesignConcept {
  const conceptFromTag = tagValue(item.tags, "sd-concept");
  if (conceptFromTag) {
    const normalized = conceptFromTag.replace(/[-_]+/g, " ").trim().toLowerCase();
    const mapped = SYSTEM_DESIGN_CONCEPTS.find((entry) => entry.toLowerCase() === normalized);
    if (mapped) return mapped;
  }

  const raw = normalizedSource(item);

  if (raw.includes("url shortener") || raw.includes("rate limiter")) return "Foundations";
  if (
    raw.includes("distributed") ||
    raw.includes("replication") ||
    raw.includes("quorum") ||
    raw.includes("consensus") ||
    raw.includes("raft") ||
    raw.includes("paxos") ||
    raw.includes("saga") ||
    raw.includes("2pc") ||
    raw.includes("3pc") ||
    raw.includes("idempotency") ||
    raw.includes("cap theorem")
  ) {
    return "Distributed Systems Fundamentals";
  }
  if (raw.includes("notification") || raw.includes("chat") || raw.includes("stream") || raw.includes("websocket")) {
    return "Realtime Communication";
  }
  if (raw.includes("matching") || raw.includes("dispatch") || raw.includes("queue")) return "Matching & Dispatch";
  if (
    raw.includes("geo") ||
    raw.includes("location") ||
    raw.includes("eta") ||
    raw.includes("route")
  ) {
    return "Geo, ETA & Routing";
  }
  if (raw.includes("pricing") || raw.includes("surge") || raw.includes("incentive") || raw.includes("marketplace")) {
    return "Marketplace & Pricing";
  }
  if (raw.includes("event") || raw.includes("pipeline") || raw.includes("history") || raw.includes("storage")) {
    return "Data Platform & Storage";
  }
  if (raw.includes("payment") || raw.includes("idempotent")) return "Payments & Reliability";
  if (raw.includes("safety") || raw.includes("rating") || raw.includes("feedback") || raw.includes("identity")) {
    return "Trust, Safety & Feedback";
  }
  if (raw.includes("feature flag") || raw.includes("experimentation") || raw.includes("workflow")) {
    return "Experimentation & Platform";
  }
  if (raw.includes("search") || raw.includes("retrieval")) return "Search & Discovery";
  if (
    raw.includes("rag") ||
    raw.includes("llm") ||
    raw.includes("agent") ||
    raw.includes("prompt") ||
    raw.includes("embedding")
  ) {
    return "AI / GenAI Systems";
  }

  return "General";
}

export function inferSystemDesignLevel(
  item: Pick<PrepItem, "title" | "systemTopic" | "tags" | "metadata">
): SystemDesignLevel {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const metaLevel = metadata.sdLevel;
  if (metaLevel === "EASY" || metaLevel === "MEDIUM" || metaLevel === "HARD") {
    return metaLevel;
  }

  const levelFromTag = tagValue(item.tags, "sd-level");
  if (levelFromTag) {
    const normalized = levelFromTag.trim().toUpperCase();
    if (normalized === "EASY" || normalized === "MEDIUM" || normalized === "HARD") return normalized;
  }

  const raw = normalizedSource(item);
  if (
    raw.includes("feature flag") ||
    raw.includes("experimentation") ||
    raw.includes("workflow") ||
    raw.includes("notification") ||
    raw.includes("url shortener") ||
    raw.includes("rating") ||
    raw.includes("feedback")
  ) {
    return "EASY";
  }
  if (
    raw.includes("matching") ||
    raw.includes("dispatch") ||
    raw.includes("payment") ||
    raw.includes("pipeline") ||
    raw.includes("history") ||
    raw.includes("safety") ||
    raw.includes("eta") ||
    raw.includes("surge") ||
    raw.includes("route") ||
    raw.includes("replication")
  ) {
    return "MEDIUM";
  }
  if (
    raw.includes("consensus") ||
    raw.includes("raft") ||
    raw.includes("paxos") ||
    raw.includes("flp") ||
    raw.includes("distributed transaction") ||
    raw.includes("saga")
  ) {
    return "HARD";
  }
  return "MEDIUM";
}
