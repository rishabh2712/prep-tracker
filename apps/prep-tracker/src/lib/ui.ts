import { formatDistanceToNowStrict } from "date-fns";

export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatRelative(date: string | null | undefined): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  const dist = formatDistanceToNowStrict(parsed, { addSuffix: true });
  return dist;
}

export function isDue(date: string | null | undefined): boolean {
  if (!date) return false;
  return new Date(date).getTime() <= Date.now();
}

export function parseCsvList(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function tagsToCsv(tags: string[]): string {
  return tags.join(", ");
}
