export function toIsoFromDateInput(raw: string): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export type LinkInput = {
  label: string;
  url: string;
};

export function sanitizeLinks(links: LinkInput[]) {
  return links
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label && link.url);
}

export function isValidHttpUrl(raw: string): boolean {
  return /^https?:\/\//i.test(raw.trim());
}
