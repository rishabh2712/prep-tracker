import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const cwd = process.cwd();
const dbPath = process.env.PREP_TRACKER_DB_PATH?.trim() || path.join(cwd, "data", "prep.db");
const csvPath = path.join(cwd, "data", "imports", "uber-hackerrank-derived-2026-03-25.csv");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function parseSimpleCsv(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((value) => value.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function normalizeTags(tags) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function dedupeLinks(links) {
  const seen = new Set();
  const result = [];
  for (const link of links) {
    const key = `${link.label}::${link.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ id: link.id ?? randomUUID(), label: link.label, url: link.url });
  }
  return result;
}

function canonicalProblemUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url.trim() || null;
  }
}

function normalizeSlug(slug) {
  return slug?.trim().toLowerCase() || null;
}

function toCanonicalKey(type, problemLink, problemSlug, title, systemTopic) {
  if (type === "LEETCODE") {
    const slug = normalizeSlug(problemSlug);
    if (slug) return `LEETCODE:slug:${slug}`;
    const url = canonicalProblemUrl(problemLink);
    if (url) return `LEETCODE:url:${url}`;
    return `LEETCODE:title:${title.trim().toLowerCase()}`;
  }
  return systemTopic ? `${type}:topic:${systemTopic.trim().toLowerCase()}` : `${type}:title:${title.trim().toLowerCase()}`;
}

function defaultItem(type, timestamp) {
  return {
    id: randomUUID(),
    owner_user_id: null,
    is_shared: 0,
    title: "",
    type,
    notes_markdown: "",
    state: "ACTIVE",
    mastery: "LOW",
    should_review_again: 1,
    review_interval_days: 7,
    next_review_at: null,
    last_reviewed_at: null,
    tags_json: "[]",
    deleted_at: null,
    links_json: "[]",
    platform: null,
    problem_link: null,
    problem_slug: null,
    difficulty: null,
    pattern: null,
    attempt_count: 0,
    time_spent_minutes: null,
    confidence: null,
    last_attempted_at: null,
    leetcode_outcome: "TODO",
    last_solved_at: null,
    solution_summary_markdown: null,
    system_topic: null,
    system_scale_notes: null,
    problem_statement: null,
    functional_requirements: null,
    non_functional_requirements: null,
    capacity_estimates: null,
    api_contracts: null,
    data_model_notes: null,
    architecture_notes: null,
    component_deep_dives: null,
    scaling_strategy: null,
    consistency_tradeoffs: null,
    caching_strategy: null,
    failure_modes_recovery: null,
    observability: null,
    security_privacy: null,
    cost_considerations: null,
    alternatives_tradeoffs: null,
    what_i_missed: null,
    follow_up_topics: null,
    metadata_json: "{}",
    canonical_key: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function main() {
  const db = new Database(dbPath);
  const rows = parseSimpleCsv(fs.readFileSync(csvPath, "utf8"));
  const timestamp = nowIso();

  const selectBySlug = db.prepare("select * from items where problem_slug = ? order by created_at asc limit 1");
  const selectByCanonical = db.prepare("select * from items where canonical_key = ? order by created_at asc limit 1");
  const selectByTitle = db.prepare("select * from items where type = 'LEETCODE' and lower(title) = lower(?) order by created_at asc limit 1");
  const updateStmt = db.prepare(`
    update items set
      title=@title,
      notes_markdown=@notes_markdown,
      tags_json=@tags_json,
      links_json=@links_json,
      platform=@platform,
      problem_link=@problem_link,
      problem_slug=@problem_slug,
      difficulty=@difficulty,
      pattern=@pattern,
      metadata_json=@metadata_json,
      canonical_key=@canonical_key,
      updated_at=@updated_at
    where id=@id
  `);
  const insertStmt = db.prepare(`
    insert into items (
      id, owner_user_id, is_shared, title, type, notes_markdown, state, mastery, should_review_again,
      review_interval_days, next_review_at, last_reviewed_at, tags_json, deleted_at, links_json, platform,
      problem_link, problem_slug, difficulty, pattern, attempt_count, time_spent_minutes, confidence,
      last_attempted_at, leetcode_outcome, last_solved_at, solution_summary_markdown, system_topic,
      system_scale_notes, problem_statement, functional_requirements, non_functional_requirements,
      capacity_estimates, api_contracts, data_model_notes, architecture_notes, component_deep_dives,
      scaling_strategy, consistency_tradeoffs, caching_strategy, failure_modes_recovery, observability,
      security_privacy, cost_considerations, alternatives_tradeoffs, what_i_missed, follow_up_topics,
      metadata_json, canonical_key, created_at, updated_at
    ) values (
      @id, @owner_user_id, @is_shared, @title, @type, @notes_markdown, @state, @mastery, @should_review_again,
      @review_interval_days, @next_review_at, @last_reviewed_at, @tags_json, @deleted_at, @links_json, @platform,
      @problem_link, @problem_slug, @difficulty, @pattern, @attempt_count, @time_spent_minutes, @confidence,
      @last_attempted_at, @leetcode_outcome, @last_solved_at, @solution_summary_markdown, @system_topic,
      @system_scale_notes, @problem_statement, @functional_requirements, @non_functional_requirements,
      @capacity_estimates, @api_contracts, @data_model_notes, @architecture_notes, @component_deep_dives,
      @scaling_strategy, @consistency_tradeoffs, @caching_strategy, @failure_modes_recovery, @observability,
      @security_privacy, @cost_considerations, @alternatives_tradeoffs, @what_i_missed, @follow_up_topics,
      @metadata_json, @canonical_key, @created_at, @updated_at
    )
  `);

  let inserted = 0;
  let updated = 0;

  const tx = db.transaction(() => {
    for (const row of rows) {
      const slug = normalizeSlug(row.leetcode_slug);
      const link = canonicalProblemUrl(row.leetcode_link);
      const canonicalKey = toCanonicalKey("LEETCODE", link, slug, row.leetcode_title, null);
      const existing =
        (slug ? selectBySlug.get(slug) : null) ||
        (canonicalKey ? selectByCanonical.get(canonicalKey) : null) ||
        selectByTitle.get(row.leetcode_title);

      const mapping = {
        hackerrankTitle: row.hackerrank_title,
        hackerrankDifficulty: row.hackerrank_difficulty,
        hackerrankAccess: row.hackerrank_access,
        mappingQuality: row.mapping_quality,
        derivedStatement: row.derived_statement,
        capturedAt: timestamp,
      };

      if (existing) {
        const metadata = existing.metadata_json ? JSON.parse(existing.metadata_json) : {};
        const prevMappings = Array.isArray(metadata.uberHackerRankMappings) ? metadata.uberHackerRankMappings : [];
        const hasMapping = prevMappings.some((entry) => entry?.hackerrankTitle === row.hackerrank_title);
        metadata.uberHackerRankMappings = hasMapping ? prevMappings : [...prevMappings, mapping];
        metadata.uberHackerRankSource = { source: "derived-analysis", importedAt: timestamp };

        const tags = normalizeTags([
          ...(existing.tags_json ? JSON.parse(existing.tags_json) : []),
          "leetcode",
          "uber",
          "hackerrank",
          "company:uber",
          "source:uber-hackerrank-derived",
        ]);
        const links = dedupeLinks([
          ...(existing.links_json ? JSON.parse(existing.links_json) : []),
          { label: "Problem", url: row.leetcode_link },
        ]);

        updateStmt.run({
          id: existing.id,
          title: existing.title?.trim() || row.leetcode_title,
          notes_markdown:
            existing.notes_markdown?.trim() ||
            [
              `# ${row.leetcode_title}`,
              "",
              "- Source: Uber HackerRank derived mapping",
              `- HackerRank title: ${row.hackerrank_title}`,
              `- Mapping quality: ${row.mapping_quality}`,
              `- Access status: ${row.hackerrank_access}`,
              "",
              "## Derived Prompt Angle",
              `- ${row.derived_statement}`,
            ].join("\n"),
          tags_json: JSON.stringify(tags),
          links_json: JSON.stringify(links),
          platform: existing.platform || "LeetCode",
          problem_link: existing.problem_link || row.leetcode_link,
          problem_slug: existing.problem_slug || row.leetcode_slug,
          difficulty: existing.difficulty || row.hackerrank_difficulty,
          pattern: existing.pattern || row.pattern,
          metadata_json: JSON.stringify(metadata),
          canonical_key: existing.canonical_key || canonicalKey,
          updated_at: timestamp,
        });
        updated += 1;
        continue;
      }

      const base = defaultItem("LEETCODE", timestamp);
      const tags = normalizeTags(["leetcode", "uber", "hackerrank", "company:uber", "source:uber-hackerrank-derived"]);
      const links = dedupeLinks([{ label: "Problem", url: row.leetcode_link }]);
      const metadata = {
        uberHackerRankMappings: [mapping],
        uberHackerRankSource: { source: "derived-analysis", importedAt: timestamp },
      };
      const payload = {
        ...base,
        title: row.leetcode_title,
        notes_markdown: [
          `# ${row.leetcode_title}`,
          "",
          "- Source: Uber HackerRank derived mapping",
          `- HackerRank title: ${row.hackerrank_title}`,
          `- Mapping quality: ${row.mapping_quality}`,
          `- Access status: ${row.hackerrank_access}`,
          "",
          "## Derived Prompt Angle",
          `- ${row.derived_statement}`,
        ].join("\n"),
        tags_json: JSON.stringify(tags),
        links_json: JSON.stringify(links),
        platform: "LeetCode",
        problem_link: row.leetcode_link,
        problem_slug: row.leetcode_slug,
        difficulty: row.hackerrank_difficulty,
        pattern: row.pattern,
        metadata_json: JSON.stringify(metadata),
        canonical_key: canonicalKey,
      };
      insertStmt.run(payload);
      inserted += 1;
    }
  });

  tx();
  console.log(
    JSON.stringify(
      {
        ok: true,
        processed: rows.length,
        inserted,
        updated,
        dbPath,
        checksum: sha256(fs.readFileSync(csvPath, "utf8")),
      },
      null,
      2
    )
  );
}

main();
