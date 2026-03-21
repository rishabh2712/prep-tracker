import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PrepPacketDay, PrepPacketQuestion } from "@/lib/types";

function getPacketsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "../../prep/packets"),
    path.resolve(process.cwd(), "../prep/packets"),
    path.resolve(process.cwd(), "prep/packets"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return candidates[0];
}

function parseQuestion(label: string, rawValue: string): PrepPacketQuestion {
  const raw = rawValue.trim();
  const match = raw.match(/^(\d+)\s+(.+)$/);
  if (!match) {
    return { label, raw, problemId: null, title: raw };
  }

  return {
    label,
    raw,
    problemId: Number(match[1]),
    title: match[2].trim(),
  };
}

function pickFirstMatch(content: string, pattern: RegExp): string | null {
  const match = content.match(pattern);
  if (!match) return null;
  return match[1].trim() || null;
}

function parseReviewPrompts(content: string): string[] {
  const reviewSectionMatch = content.match(/##\s+Review[\s\S]*$/m);
  if (!reviewSectionMatch) return [];

  return reviewSectionMatch[0]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function parsePacket(dayNumber: number, content: string): PrepPacketDay {
  const headingLine = content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? `Day ${String(dayNumber).padStart(2, "0")}`;
  const headingDate = pickFirstMatch(content, /^#\s+Day\s+\d+\s*-\s*([0-9]{4}-[0-9]{2}-[0-9]{2})$/m);
  const concept = pickFirstMatch(content, /^-\s+Concept:\s*(.+)$/m);
  const subFocus = pickFirstMatch(content, /^-\s+Sub-focus:\s*(.+)$/m);

  const core1 = pickFirstMatch(content, /^-\s+Core Q1:\s*(.+)$/m);
  const core2 = pickFirstMatch(content, /^-\s+Core Q2:\s*(.+)$/m);
  const stretch = pickFirstMatch(content, /^-\s+Stretch:\s*(.*)$/m);

  const codingCore: PrepPacketQuestion[] = [];
  if (core1) codingCore.push(parseQuestion("Core Q1", core1));
  if (core2) codingCore.push(parseQuestion("Core Q2", core2));

  return {
    dayNumber,
    date: headingDate,
    heading: headingLine,
    concept,
    subFocus,
    codingCore,
    codingStretch: stretch ? parseQuestion("Stretch", stretch) : null,
    designPrompt: pickFirstMatch(content, /^-\s+Prompt:\s*(.+)$/m),
    buildTask: pickFirstMatch(content, /^-\s+Task:\s*(.+)$/m),
    leadershipQuestion: pickFirstMatch(content, /^-\s+Question:\s*(.+)$/m),
    reviewPrompts: parseReviewPrompts(content),
    rawMarkdown: content,
  };
}

export async function listPrepPackets(): Promise<PrepPacketDay[]> {
  const packetsDir = getPacketsDir();
  if (!existsSync(packetsDir)) return [];

  const files = (await readdir(packetsDir))
    .filter((name) => /^day-\d+\.md$/i.test(name))
    .sort((a, b) => {
      const aNum = Number(a.match(/\d+/)?.[0] ?? 0);
      const bNum = Number(b.match(/\d+/)?.[0] ?? 0);
      return aNum - bNum;
    });

  const packets: PrepPacketDay[] = [];
  for (const file of files) {
    const dayNumber = Number(file.match(/\d+/)?.[0] ?? 0);
    if (!dayNumber) continue;
    const fullPath = path.join(packetsDir, file);
    const content = await readFile(fullPath, "utf8");
    packets.push(parsePacket(dayNumber, content));
  }

  return packets;
}
