import { addDays } from "date-fns";
import type { ReviewOutcome } from "@/lib/types";

export function computeNextIntervalDays(current: number, outcome: ReviewOutcome): number {
  const base = Number.isFinite(current) && current > 0 ? Math.floor(current) : 7;

  if (outcome === "AGAIN") {
    return Math.max(1, Math.floor(base / 2));
  }
  if (outcome === "HARD") {
    return Math.max(2, Math.floor(base * 0.8));
  }
  if (outcome === "GOOD") {
    return Math.min(60, base + 2);
  }
  return Math.min(90, base * 2);
}

export function nextReviewFromNow(intervalDays: number): string {
  return addDays(new Date(), Math.max(1, intervalDays)).toISOString();
}

export function isDueDate(isoDate: string | null): boolean {
  if (!isoDate) return false;
  return new Date(isoDate).getTime() <= Date.now();
}

export function isToday(isoDate: string | null): boolean {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}
