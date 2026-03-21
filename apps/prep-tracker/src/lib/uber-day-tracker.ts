import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UberDayRecord } from "@/lib/types";
import type { UberDayUpdateInput } from "@/lib/validators";

const HEADERS = [
  "day",
  "date",
  "concept",
  "core_q1",
  "core_q2",
  "stretch_q",
  "status",
  "coding_score_10",
  "design_score_10",
  "build_done",
  "leadership_done",
  "total_minutes",
  "mistake_tags",
  "reattempt_date",
  "notes",
] as const;

type CsvHeader = (typeof HEADERS)[number];

type CsvRow = Record<CsvHeader, string>;

function getCsvPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "../../prep/tracker/daily-progress.csv"),
    path.resolve(process.cwd(), "../prep/tracker/daily-progress.csv"),
    path.resolve(process.cwd(), "prep/tracker/daily-progress.csv"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return candidates[0];
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  cells.push(current);
  return cells;
}

function toCsvCell(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function readRows(): Promise<CsvRow[]> {
  const csvPath = getCsvPath();
  if (!existsSync(csvPath)) {
    return [];
  }

  const raw = await readFile(csvPath, "utf8");
  const lines = raw.trimEnd().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const row: Partial<CsvRow> = {};
    headers.forEach((header, idx) => {
      if ((HEADERS as readonly string[]).includes(header)) {
        row[header as CsvHeader] = cells[idx] ?? "";
      }
    });

    rows.push(row as CsvRow);
  }

  return rows;
}

async function writeRows(rows: CsvRow[]) {
  const csvPath = getCsvPath();
  const lines = [HEADERS.join(",")];

  for (const row of rows) {
    const line = HEADERS.map((header) => toCsvCell(row[header] ?? "")).join(",");
    lines.push(line);
  }

  await writeFile(csvPath, `${lines.join("\n")}\n`, "utf8");
}

function toUberDay(row: CsvRow): UberDayRecord {
  return {
    ...row,
    day: Number(row.day),
    status: row.status as UberDayRecord["status"],
  };
}

export async function listUberDays(): Promise<UberDayRecord[]> {
  const rows = await readRows();
  return rows
    .map(toUberDay)
    .sort((a, b) => a.day - b.day);
}

export async function updateUberDay(day: number, input: UberDayUpdateInput): Promise<UberDayRecord | null> {
  const rows = await readRows();
  const idx = rows.findIndex((row) => Number(row.day) === day);
  if (idx === -1) return null;

  const target = rows[idx];

  const updates: Record<CsvHeader, string | undefined> = {
    day: undefined,
    date: undefined,
    concept: undefined,
    core_q1: undefined,
    core_q2: undefined,
    stretch_q: undefined,
    status: input.status,
    coding_score_10: input.coding_score_10,
    design_score_10: input.design_score_10,
    build_done: input.build_done,
    leadership_done: input.leadership_done,
    total_minutes: input.total_minutes,
    mistake_tags: input.mistake_tags,
    reattempt_date: input.reattempt_date,
    notes: input.notes,
  };

  for (const header of HEADERS) {
    const value = updates[header];
    if (value !== undefined) {
      target[header] = String(value);
    }
  }

  rows[idx] = target;
  await writeRows(rows);

  return toUberDay(target);
}
