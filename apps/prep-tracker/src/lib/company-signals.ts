import type { PrepItem } from "@/lib/types";

export type CompanySignal = {
  name: string;
  score: number | null;
};

function toLabel(raw: string): string {
  return raw
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fromTag(tag: string): string | null {
  if (!tag.startsWith("company:")) return null;
  const value = tag.slice("company:".length).trim();
  if (!value) return null;
  return toLabel(value.replace(/[-_]+/g, " "));
}

function safeScore(raw: unknown): number | null {
  const score = Number(raw);
  if (!Number.isFinite(score)) return null;
  return score;
}

export function companySignalsFromItem(item: PrepItem): CompanySignal[] {
  const byName = new Map<string, CompanySignal>();

  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const frequency = Array.isArray(metadata.companyFrequency) ? metadata.companyFrequency : [];
  for (const entry of frequency) {
    if (!entry || typeof entry !== "object") continue;
    const nameRaw = (entry as Record<string, unknown>).name;
    if (typeof nameRaw !== "string" || !nameRaw.trim()) continue;
    const name = toLabel(nameRaw.trim());
    const key = name.toLowerCase();
    const score = safeScore((entry as Record<string, unknown>).score);
    const existing = byName.get(key);
    if (!existing || (score !== null && (existing.score === null || score > existing.score))) {
      byName.set(key, { name, score });
    }
  }

  for (const tag of item.tags ?? []) {
    const name = fromTag(tag);
    if (!name) continue;
    const key = name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { name, score: null });
    }
  }

  return Array.from(byName.values()).sort((a, b) => {
    if (a.score !== null && b.score !== null) return b.score - a.score;
    if (a.score !== null) return -1;
    if (b.score !== null) return 1;
    return a.name.localeCompare(b.name);
  });
}
