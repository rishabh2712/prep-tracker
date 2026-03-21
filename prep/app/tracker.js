#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const STORE_DIR = path.join(ROOT, 'local-store');
const RESPONSES_PATH = path.join(STORE_DIR, 'responses.jsonl');
const METRICS_PATH = path.join(STORE_DIR, 'daily-metrics.json');
const TRACKER_CSV = path.join(ROOT, 'tracker', 'daily-progress.csv');

const CSV_COLUMNS = [
  'day',
  'date',
  'concept',
  'core_q1',
  'core_q2',
  'stretch_q',
  'status',
  'coding_score_10',
  'design_score_10',
  'build_done',
  'leadership_done',
  'total_minutes',
  'mistake_tags',
  'reattempt_date',
  'notes',
];

function ensureStore() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(RESPONSES_PATH)) {
    fs.writeFileSync(RESPONSES_PATH, '', 'utf8');
  }
  if (!fs.existsSync(METRICS_PATH)) {
    fs.writeFileSync(METRICS_PATH, '{}\n', 'utf8');
  }
}

function usage() {
  const message = `Usage:
  node prep/app/tracker.js record --day <1-45> --section <coding|design|build|leadership|review> --response "text" [options]
  node prep/app/tracker.js analyze
  node prep/app/tracker.js report [--out prep/tracker/progression-report.md]

Record options:
  --response-file <path-to-text-or-markdown>
  --status <NOT_STARTED|IN_PROGRESS|COMPLETED>
  --coding-score <0-10>
  --design-score <0-10>
  --build-done <true|false>
  --leadership-done <true|false>
  --minutes <number>
  --mistakes "tag1,tag2"
  --reattempt-date <YYYY-MM-DD>
  --notes "text"

Examples:
  node prep/app/tracker.js record --day 1 --section coding --response "Solved in 35 mins" --coding-score 7 --minutes 120 --mistakes "edge-case,hash-collision"
  node prep/app/tracker.js record --day 1 --section review --response-file prep/packets/day-01.md --notes "Captured full packet notes"
  cat notes.txt | node prep/app/tracker.js record --day 2 --section design --design-score 6
  node prep/app/tracker.js analyze
  node prep/app/tracker.js report --out prep/tracker/progression-report.md
`;
  process.stdout.write(message);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function parseBool(v) {
  if (v === undefined) return undefined;
  const s = String(v).toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  throw new Error(`Invalid boolean value: ${v}`);
}

function parseNum(v, field) {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid numeric value for ${field}: ${v}`);
  }
  return n;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

function appendJsonl(filePath, obj) {
  fs.appendFileSync(filePath, `${JSON.stringify(obj)}\n`, 'utf8');
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
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
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function escapeCsvCell(value) {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function readCsvObjects(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trimEnd();
  const lines = raw.split('\n');
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? '';
    });
    return obj;
  });
}

function writeCsvObjects(filePath, rows) {
  const headerLine = CSV_COLUMNS.join(',');
  const lines = rows.map((row) => CSV_COLUMNS.map((col) => escapeCsvCell(row[col] ?? '')).join(','));
  fs.writeFileSync(filePath, `${headerLine}\n${lines.join('\n')}\n`, 'utf8');
}

function validateDay(dayRaw) {
  const day = parseInt(String(dayRaw), 10);
  if (!Number.isInteger(day) || day < 1 || day > 45) {
    throw new Error('Day must be an integer between 1 and 45.');
  }
  return day;
}

function validateSection(sectionRaw) {
  const allowed = new Set(['coding', 'design', 'build', 'leadership', 'review']);
  if (!allowed.has(sectionRaw)) {
    throw new Error('Section must be one of coding, design, build, leadership, review.');
  }
  return sectionRaw;
}

function updateCsvRow(day, updates) {
  if (!fs.existsSync(TRACKER_CSV)) {
    throw new Error(`Missing tracker CSV at ${TRACKER_CSV}`);
  }
  const rows = readCsvObjects(TRACKER_CSV);
  const row = rows.find((r) => Number(r.day) === day);
  if (!row) {
    throw new Error(`Day ${day} not found in tracker CSV.`);
  }

  Object.entries(updates).forEach(([k, v]) => {
    if (v === undefined) return;
    row[k] = String(v);
  });

  if (!updates.status && row.status === 'NOT_STARTED') {
    row.status = 'IN_PROGRESS';
  }

  const buildDone = String(row.build_done).toLowerCase() === 'true';
  const leadershipDone = String(row.leadership_done).toLowerCase() === 'true';
  const codingDone = row.coding_score_10 !== '';
  const designDone = row.design_score_10 !== '';
  if (buildDone && leadershipDone && codingDone && designDone && row.status !== 'COMPLETED') {
    row.status = 'COMPLETED';
  }

  writeCsvObjects(TRACKER_CSV, rows);
  return row;
}

function commandRecord(args) {
  ensureStore();

  const day = validateDay(args.day);
  const section = validateSection(args.section);
  let response = args.response;
  if (!response && args['response-file']) {
    const responseFilePath = path.resolve(process.cwd(), String(args['response-file']));
    if (!fs.existsSync(responseFilePath)) {
      throw new Error(`Response file not found: ${responseFilePath}`);
    }
    response = fs.readFileSync(responseFilePath, 'utf8');
  }
  if (!response && !process.stdin.isTTY) {
    response = fs.readFileSync(0, 'utf8');
  }
  if (!response || String(response).trim().length === 0) {
    throw new Error('Provide response text via --response, --response-file, or stdin.');
  }

  const codingScore = parseNum(args['coding-score'], 'coding-score');
  const designScore = parseNum(args['design-score'], 'design-score');
  const minutes = parseNum(args.minutes, 'minutes');
  const buildDone = parseBool(args['build-done']);
  const leadershipDone = parseBool(args['leadership-done']);
  const mistakes = args.mistakes ? String(args.mistakes).split(',').map((t) => t.trim()).filter(Boolean) : [];
  const now = new Date().toISOString();

  const event = {
    id: crypto.randomUUID(),
    ts: now,
    day,
    section,
    response,
    metrics: {
      status: args.status,
      coding_score_10: codingScore,
      design_score_10: designScore,
      build_done: buildDone,
      leadership_done: leadershipDone,
      total_minutes: minutes,
      mistake_tags: mistakes,
      reattempt_date: args['reattempt-date'],
      notes: args.notes,
    },
  };

  appendJsonl(RESPONSES_PATH, event);

  const dailyMetrics = readJson(METRICS_PATH, {});
  const existing = dailyMetrics[String(day)] || {
    day,
    entries: 0,
    sections: { coding: false, design: false, build: false, leadership: false, review: false },
    notes: [],
    mistake_tags: [],
  };

  existing.entries += 1;
  existing.last_updated = now;
  existing.last_event_id = event.id;
  existing.sections[section] = true;

  if (codingScore !== undefined) existing.coding_score_10 = codingScore;
  if (designScore !== undefined) existing.design_score_10 = designScore;
  if (buildDone !== undefined) existing.build_done = buildDone;
  if (leadershipDone !== undefined) existing.leadership_done = leadershipDone;
  if (minutes !== undefined) existing.total_minutes = minutes;
  if (args.status !== undefined) existing.status = args.status;
  if (args['reattempt-date'] !== undefined) existing.reattempt_date = args['reattempt-date'];
  if (mistakes.length > 0) {
    const merged = new Set([...(existing.mistake_tags || []), ...mistakes]);
    existing.mistake_tags = Array.from(merged);
  }
  if (args.notes) {
    existing.notes = [...(existing.notes || []), args.notes].slice(-10);
  }

  if (!existing.status) {
    existing.status = 'IN_PROGRESS';
  }

  dailyMetrics[String(day)] = existing;
  writeJson(METRICS_PATH, dailyMetrics);

  const csvUpdates = {
    status: args.status,
    coding_score_10: codingScore,
    design_score_10: designScore,
    build_done: buildDone,
    leadership_done: leadershipDone,
    total_minutes: minutes,
    mistake_tags: mistakes.join('|') || undefined,
    reattempt_date: args['reattempt-date'],
    notes: args.notes,
  };

  const updatedRow = updateCsvRow(day, csvUpdates);

  process.stdout.write(`Recorded day ${day} (${section}) at ${now}.\n`);
  process.stdout.write(`Updated tracker status: ${updatedRow.status}.\n`);
}

function loadResponseEvents() {
  if (!fs.existsSync(RESPONSES_PATH)) return [];
  const raw = fs.readFileSync(RESPONSES_PATH, 'utf8').trim();
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function summarize() {
  ensureStore();
  const rows = readCsvObjects(TRACKER_CSV);
  const events = loadResponseEvents();

  const completed = rows.filter((r) => r.status === 'COMPLETED').length;
  const inProgress = rows.filter((r) => r.status === 'IN_PROGRESS').length;
  const notStarted = rows.filter((r) => r.status === 'NOT_STARTED').length;

  const codingScores = rows
    .map((r) => Number(r.coding_score_10))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const designScores = rows
    .map((r) => Number(r.design_score_10))
    .filter((n) => Number.isFinite(n) && n >= 0);

  const avg = (arr) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length);

  const tagFreq = {};
  rows.forEach((r) => {
    if (!r.mistake_tags) return;
    r.mistake_tags
      .split('|')
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => {
        tagFreq[t] = (tagFreq[t] || 0) + 1;
      });
  });

  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    generated_at: new Date().toISOString(),
    days_total: rows.length,
    completed_days: completed,
    in_progress_days: inProgress,
    not_started_days: notStarted,
    completion_rate_pct: rows.length === 0 ? 0 : Math.round((completed / rows.length) * 100),
    avg_coding_score_10: Number(avg(codingScores).toFixed(2)),
    avg_design_score_10: Number(avg(designScores).toFixed(2)),
    total_response_events: events.length,
    top_mistake_tags: topTags,
  };
}

function commandAnalyze() {
  const s = summarize();
  process.stdout.write('Progress Summary\n');
  process.stdout.write(`- Generated at: ${s.generated_at}\n`);
  process.stdout.write(`- Days: ${s.completed_days}/${s.days_total} completed (${s.completion_rate_pct}%)\n`);
  process.stdout.write(`- In progress: ${s.in_progress_days}\n`);
  process.stdout.write(`- Not started: ${s.not_started_days}\n`);
  process.stdout.write(`- Avg coding score: ${s.avg_coding_score_10}/10\n`);
  process.stdout.write(`- Avg design score: ${s.avg_design_score_10}/10\n`);
  process.stdout.write(`- Logged response events: ${s.total_response_events}\n`);
  if (s.top_mistake_tags.length > 0) {
    process.stdout.write('- Top mistake tags:\n');
    s.top_mistake_tags.forEach(([tag, count]) => {
      process.stdout.write(`  - ${tag}: ${count}\n`);
    });
  }
}

function commandReport(args) {
  const s = summarize();
  const outPath = path.resolve(process.cwd(), args.out || 'prep/tracker/progression-report.md');

  const report = [
    '# Progression Report',
    '',
    `- Generated at: ${s.generated_at}`,
    `- Completed days: ${s.completed_days}/${s.days_total} (${s.completion_rate_pct}%)`,
    `- In-progress days: ${s.in_progress_days}`,
    `- Not-started days: ${s.not_started_days}`,
    `- Avg coding score: ${s.avg_coding_score_10}/10`,
    `- Avg design score: ${s.avg_design_score_10}/10`,
    `- Response events logged: ${s.total_response_events}`,
    '',
    '## Top Mistake Tags',
  ];

  if (s.top_mistake_tags.length === 0) {
    report.push('- None logged yet');
  } else {
    s.top_mistake_tags.forEach(([tag, count]) => {
      report.push(`- ${tag}: ${count}`);
    });
  }

  report.push('', '## Next Focus');
  if (s.completion_rate_pct < 40) {
    report.push('- Maintain consistency: prioritize daily completion over perfect scores.');
  } else if (s.avg_coding_score_10 < 7) {
    report.push('- Raise coding stability: add one timed reattempt block each day.');
  } else if (s.avg_design_score_10 < 7) {
    report.push('- Raise design depth: include failure mode and cost analysis in every answer.');
  } else {
    report.push('- Keep mock intensity high and focus on staff-level leadership articulation.');
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${report.join('\n')}\n`, 'utf8');
  process.stdout.write(`Wrote report to ${outPath}\n`);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    usage();
    return;
  }

  const cmd = argv[0];
  const args = parseArgs(argv.slice(1));

  try {
    if (cmd === 'record') {
      commandRecord(args);
      return;
    }
    if (cmd === 'analyze') {
      commandAnalyze(args);
      return;
    }
    if (cmd === 'report') {
      commandReport(args);
      return;
    }
    usage();
    process.exitCode = 1;
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exitCode = 1;
  }
}

main();
