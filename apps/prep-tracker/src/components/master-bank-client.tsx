"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import { companySignalsFromItem } from "@/lib/company-signals";
import { LEETCODE_PATTERN_LIBRARY, LEETCODE_PATTERN_REFERENCE_LINKS } from "@/lib/leetcode-patterns";
import { inferSystemDesignConcept, inferSystemDesignLevel } from "@/lib/system-design-taxonomy";
import type { PrepItem } from "@/lib/types";
import { formatDate } from "@/lib/ui";

type BankTabKey =
  | "LEETCODE"
  | "SYSTEM_BACKEND_CORE"
  | "GENAI_BACKEND_ORCHESTRATION"
  | "GENAI_FRONTEND_LLD"
  | "DISTRIBUTED_SYSTEMS";

type PatternCategory = "Core" | "DP" | "Advanced" | "Other";

type PatternGroup = {
  category: PatternCategory;
  pattern: string;
  items: PrepItem[];
};

type SdViewItem = {
  item: PrepItem;
  concept: string;
  level: "EASY" | "MEDIUM" | "HARD";
  track: string;
};

type SdConceptGroup = {
  concept: string;
  entries: SdViewItem[];
};

const CATEGORY_ORDER: PatternCategory[] = ["Core", "DP", "Advanced", "Other"];
const SD_TAB_TRACKS: Record<Exclude<BankTabKey, "LEETCODE">, { track: string; label: string }> = {
  SYSTEM_BACKEND_CORE: { track: "backend-core", label: "System Design (backend core)" },
  GENAI_BACKEND_ORCHESTRATION: { track: "genai-backend-orchestration", label: "GenAI backend orchestration (RAG/KB)" },
  GENAI_FRONTEND_LLD: { track: "genai-frontend-lld", label: "GenAI frontend + LLD" },
  DISTRIBUTED_SYSTEMS: { track: "distributed-systems", label: "Distributed systems" },
};

const COMPANY_PILL_STYLES = [
  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "bg-sky-100 text-sky-800 border-sky-300",
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-rose-100 text-rose-800 border-rose-300",
  "bg-violet-100 text-violet-800 border-violet-300",
  "bg-cyan-100 text-cyan-800 border-cyan-300",
  "bg-lime-100 text-lime-800 border-lime-300",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
] as const;

function parseCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toIsoFromDateInput(raw: string): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function companyPillClass(company: string): string {
  let hash = 0;
  for (let i = 0; i < company.length; i += 1) {
    hash = (hash * 31 + company.charCodeAt(i)) % 100000;
  }
  return COMPANY_PILL_STYLES[Math.abs(hash) % COMPANY_PILL_STYLES.length];
}

function sdConcept(item: PrepItem): string {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  if (typeof metadata.sdConcept === "string" && metadata.sdConcept.trim()) {
    return metadata.sdConcept.trim();
  }
  return inferSystemDesignConcept(item);
}

function sdLevel(item: PrepItem): "EASY" | "MEDIUM" | "HARD" {
  return inferSystemDesignLevel(item);
}

function sdTrack(item: PrepItem): string {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  if (typeof metadata.sdTrack === "string" && metadata.sdTrack.trim()) {
    return metadata.sdTrack.trim();
  }
  const tagTrack = (item.tags ?? []).find((tag) => tag.toLowerCase().startsWith("track:"));
  if (tagTrack) return tagTrack.slice("track:".length).trim();
  return "untracked";
}

function sdTrackTone(track: string): string {
  if (track === "backend-core") return "border-slate-300 bg-slate-50";
  if (track === "genai-backend-orchestration") return "border-emerald-300 bg-emerald-50";
  if (track === "genai-frontend-lld") return "border-sky-300 bg-sky-50";
  if (track === "distributed-systems") return "border-indigo-300 bg-indigo-50";
  return "border-amber-300 bg-amber-50";
}

function difficultyRank(raw: string | null | undefined): number {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "easy") return 0;
  if (value === "medium") return 1;
  if (value === "hard") return 2;
  return 3;
}

export function MasterBankClient() {
  const [activeTab, setActiveTab] = useState<BankTabKey>("LEETCODE");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PrepItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [lcCompanyFilters, setLcCompanyFilters] = useState<string[]>([]);
  const [lcCategoryFilter, setLcCategoryFilter] = useState<"ALL" | PatternCategory>("ALL");
  const [lcPatternFilters, setLcPatternFilters] = useState<string[]>([]);
  const [lcGroupedView, setLcGroupedView] = useState(true);

  const [sdConceptFilter, setSdConceptFilter] = useState<string>("ALL");
  const [sdLevelFilter, setSdLevelFilter] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");

  const [lcTitle, setLcTitle] = useState("");
  const [lcLink, setLcLink] = useState("");
  const [lcSlug, setLcSlug] = useState("");
  const [lcDifficulty, setLcDifficulty] = useState("Medium");
  const [lcPattern, setLcPattern] = useState<string>(LEETCODE_PATTERN_LIBRARY[0]?.name ?? "");
  const [lcTags, setLcTags] = useState("leetcode");
  const [lcNotes, setLcNotes] = useState("");
  const [lcAttempts, setLcAttempts] = useState("0");
  const [lcLastSolved, setLcLastSolved] = useState("");

  const [sdTitle, setSdTitle] = useState("");
  const [sdTopic, setSdTopic] = useState("");
  const [sdScale, setSdScale] = useState("");
  const [sdTags, setSdTags] = useState("system-design");
  const [sdNotes, setSdNotes] = useState("## Requirements\n-\n\n## High-Level Design\n-\n\n## Tradeoffs\n-");

  const [busy, setBusy] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const isLeetcodeTab = activeTab === "LEETCODE";
  const activeSystemTrack = isLeetcodeTab ? null : SD_TAB_TRACKS[activeTab as Exclude<BankTabKey, "LEETCODE">].track;
  const kindParam = useMemo(() => (isLeetcodeTab ? "LEETCODE" : "SYSTEM_DESIGN"), [isLeetcodeTab]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ kind: kindParam, q: q.trim() }).toString();
      const response = await fetch(`/api/bank?${query}`, { cache: "no-store" });
      const json = (await response.json()) as { items?: PrepItem[]; error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to load bank");
      }
      setItems(json.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load bank");
    } finally {
      setLoading(false);
    }
  }, [kindParam, q]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    setLcCompanyFilters([]);
    setLcCategoryFilter("ALL");
    setLcPatternFilters([]);
    setSdConceptFilter("ALL");
    setSdLevelFilter("ALL");
  }, [activeTab]);

  async function patchItem(itemId: string, patch: Partial<PrepItem>) {
    setUpdatingItemId(itemId);
    setError(null);
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to update item");
      }
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update item");
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function createLeetcode() {
    if (!lcTitle.trim() || !lcLink.trim()) {
      setError("LeetCode title and link are required");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const solvedIso = toIsoFromDateInput(lcLastSolved);
      const attempts = Math.max(0, Number(lcAttempts) || 0);

      const payload = {
        title: lcTitle.trim(),
        type: "LEETCODE",
        notesMarkdown: lcNotes,
        tags: parseCsv(lcTags),
        links: [{ label: "Problem", url: lcLink.trim() }],
        problemLink: lcLink.trim(),
        problemSlug: lcSlug.trim() || null,
        difficulty: lcDifficulty,
        pattern: lcPattern.trim() || null,
        platform: "LeetCode",
        shouldReviewAgain: true,
        reviewIntervalDays: 7,
        attemptCount: attempts,
        lastAttemptedAt: solvedIso,
        lastSolvedAt: solvedIso,
        leetcodeOutcome: solvedIso ? "SOLVED" : "TODO",
      };

      const response = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as { existingId?: string; error?: string };
      if (!response.ok) {
        if (response.status === 409 && json.existingId) {
          setError(`Item already exists. Open /items/${json.existingId}`);
          return;
        }
        throw new Error(json.error ?? "Unable to create LeetCode item");
      }

      setLcTitle("");
      setLcLink("");
      setLcSlug("");
      setLcNotes("");
      setLcAttempts("0");
      setLcLastSolved("");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create item");
    } finally {
      setBusy(false);
    }
  }

  async function createSystemDesign() {
    if (!sdTitle.trim()) {
      setError("System design title is required");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: sdTitle.trim(),
        type: "SYSTEM_DESIGN",
        notesMarkdown: sdNotes,
        tags: parseCsv(sdTags),
        links: [],
        systemTopic: sdTopic.trim() || sdTitle.trim(),
        systemScaleNotes: sdScale.trim() || null,
        shouldReviewAgain: true,
        reviewIntervalDays: 7,
      };

      const response = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json()) as { existingId?: string; error?: string };
      if (!response.ok) {
        if (response.status === 409 && json.existingId) {
          setError(`Topic already exists. Open /items/${json.existingId}`);
          return;
        }
        throw new Error(json.error ?? "Unable to create system design item");
      }

      setSdTitle("");
      setSdTopic("");
      setSdScale("");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create item");
    } finally {
      setBusy(false);
    }
  }

  const leetcodeItems = useMemo(() => items.filter((item) => item.type === "LEETCODE"), [items]);

  const patternToCategory = useMemo(() => {
    const map = new Map<string, PatternCategory>();
    for (const pattern of LEETCODE_PATTERN_LIBRARY) {
      map.set(pattern.name, pattern.category as PatternCategory);
    }
    return map;
  }, []);

  const leetcodeCompanies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of leetcodeItems) {
      const companies = companySignalsFromItem(item).map((entry) => entry.name);
      for (const company of companies) {
        counts.set(company, (counts.get(company) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [leetcodeItems]);

  const availablePatterns = useMemo(() => {
    const patterns = new Set<string>();
    for (const item of leetcodeItems) {
      if (item.pattern?.trim()) patterns.add(item.pattern.trim());
    }
    return Array.from(patterns).sort((a, b) => a.localeCompare(b));
  }, [leetcodeItems]);

  const filteredLeetcode = useMemo(() => {
    return leetcodeItems
      .filter((item) => {
        if (lcCompanyFilters.length > 0) {
          const itemCompanies = new Set(companySignalsFromItem(item).map((entry) => entry.name));
          const hasCompany = lcCompanyFilters.some((company) => itemCompanies.has(company));
          if (!hasCompany) return false;
        }

        if (lcCategoryFilter !== "ALL") {
          const category = (item.pattern && patternToCategory.get(item.pattern)) ?? "Other";
          if (category !== lcCategoryFilter) return false;
        }

        if (lcPatternFilters.length > 0) {
          if (!item.pattern || !lcPatternFilters.includes(item.pattern)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const diffCmp = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
        if (diffCmp !== 0) return diffCmp;
        return a.title.localeCompare(b.title);
      });
  }, [leetcodeItems, lcCompanyFilters, lcCategoryFilter, lcPatternFilters, patternToCategory]);

  const leetcodeGroups = useMemo(() => {
    const groups = new Map<string, PatternGroup>();

    for (const item of filteredLeetcode) {
      const pattern = item.pattern?.trim() || "Uncategorized";
      const category = (patternToCategory.get(pattern) ?? "Other") as PatternCategory;
      const key = `${category}::${pattern}`;

      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, { category, pattern, items: [item] });
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => {
          const diffCmp = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);
          if (diffCmp !== 0) return diffCmp;
          return a.title.localeCompare(b.title);
        }),
      }))
      .sort((a, b) => {
        const categoryCmp = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
        if (categoryCmp !== 0) return categoryCmp;
        return a.pattern.localeCompare(b.pattern);
      });
  }, [filteredLeetcode, patternToCategory]);

  const systemDesignItems = useMemo(() => items.filter((item) => item.type === "SYSTEM_DESIGN"), [items]);

  const systemDesignViewItems = useMemo<SdViewItem[]>(() => {
    return systemDesignItems.map((item) => ({
      item,
      concept: sdConcept(item),
      level: sdLevel(item),
      track: sdTrack(item),
    }));
  }, [systemDesignItems]);

  const sdConcepts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of systemDesignViewItems) {
      if (activeSystemTrack && entry.track !== activeSystemTrack) continue;
      counts.set(entry.concept, (counts.get(entry.concept) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [systemDesignViewItems, activeSystemTrack]);

  const filteredSystemDesign = useMemo(() => {
    return systemDesignViewItems
      .filter((entry) => (activeSystemTrack ? entry.track === activeSystemTrack : true))
      .filter((entry) => (sdConceptFilter === "ALL" ? true : entry.concept === sdConceptFilter))
      .filter((entry) => (sdLevelFilter === "ALL" ? true : entry.level === sdLevelFilter));
  }, [systemDesignViewItems, activeSystemTrack, sdConceptFilter, sdLevelFilter]);

  const groupedSystemDesign = useMemo<SdConceptGroup[]>(() => {
    const byConcept = new Map<string, SdViewItem[]>();
    for (const entry of filteredSystemDesign) {
      const arr = byConcept.get(entry.concept) ?? [];
      arr.push(entry);
      byConcept.set(entry.concept, arr);
    }

    return Array.from(byConcept.entries())
      .map(([concept, entries]) => ({
        concept,
        entries: entries.sort((a, b) => {
          const order = { EASY: 0, MEDIUM: 1, HARD: 2 } as const;
          const levelCmp = order[a.level] - order[b.level];
          if (levelCmp !== 0) return levelCmp;
          return a.item.title.localeCompare(b.item.title);
        }),
      }))
      .sort((a, b) => {
        const order = { EASY: 0, MEDIUM: 1, HARD: 2 } as const;
        const aMin = a.entries[0] ? order[a.entries[0].level] : 3;
        const bMin = b.entries[0] ? order[b.entries[0].level] : 3;
        if (aMin !== bMin) return aMin - bMin;
        return a.concept.localeCompare(b.concept);
      });
  }, [filteredSystemDesign]);

  function toggleCompanyFilter(company: string) {
    setLcCompanyFilters((prev) => (prev.includes(company) ? prev.filter((entry) => entry !== company) : [...prev, company]));
  }

  function togglePatternFilter(pattern: string) {
    setLcPatternFilters((prev) => (prev.includes(pattern) ? prev.filter((entry) => entry !== pattern) : [...prev, pattern]));
  }

  const createRecordPanel =
    activeTab === "LEETCODE" ? (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add LeetCode Item</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={lcTitle} onChange={(e) => setLcTitle(e.target.value)} placeholder="Title" className="rounded-md border px-3 py-2" />
          <input value={lcLink} onChange={(e) => setLcLink(e.target.value)} placeholder="Problem URL" className="rounded-md border px-3 py-2" />
          <input value={lcSlug} onChange={(e) => setLcSlug(e.target.value)} placeholder="Problem slug / ID" className="rounded-md border px-3 py-2" />
          <select value={lcDifficulty} onChange={(e) => setLcDifficulty(e.target.value)} className="rounded-md border px-3 py-2">
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <select value={lcPattern} onChange={(e) => setLcPattern(e.target.value)} className="rounded-md border px-3 py-2">
            {LEETCODE_PATTERN_LIBRARY.map((pattern) => (
              <option key={pattern.name} value={pattern.name}>
                {pattern.name}
              </option>
            ))}
          </select>
          <input value={lcTags} onChange={(e) => setLcTags(e.target.value)} placeholder="tags comma separated" className="rounded-md border px-3 py-2" />
          <input type="number" min={0} value={lcAttempts} onChange={(e) => setLcAttempts(e.target.value)} placeholder="Attempts" className="rounded-md border px-3 py-2" />
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Last solved</span>
            <input type="date" value={lcLastSolved} onChange={(e) => setLcLastSolved(e.target.value)} className="w-full rounded-md border px-3 py-2" />
          </label>
        </div>

        <div className="rounded-md border border-emerald-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Pattern references used</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEETCODE_PATTERN_REFERENCE_LINKS.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <MarkdownEditor label="Notes" value={lcNotes} onChange={setLcNotes} minHeight={180} />
        <button
          type="button"
          disabled={busy}
          onClick={() => void createLeetcode()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : "Add LeetCode"}
        </button>
      </div>
    ) : (
      <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/30 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add System Design Item</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={sdTitle} onChange={(e) => setSdTitle(e.target.value)} placeholder="Title" className="rounded-md border px-3 py-2" />
          <input value={sdTopic} onChange={(e) => setSdTopic(e.target.value)} placeholder="Topic key" className="rounded-md border px-3 py-2" />
          <input value={sdScale} onChange={(e) => setSdScale(e.target.value)} placeholder="Scale notes" className="rounded-md border px-3 py-2" />
          <input value={sdTags} onChange={(e) => setSdTags(e.target.value)} placeholder="tags comma separated" className="rounded-md border px-3 py-2" />
        </div>
        <MarkdownEditor label="Design Notes Template" value={sdNotes} onChange={setSdNotes} minHeight={220} />
        <button
          type="button"
          disabled={busy}
          onClick={() => void createSystemDesign()}
          className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : "Add System Design"}
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Bank</h1>
          <p className="text-sm text-slate-600">Canonical repository for LeetCode and System Design items.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            Home
          </Link>
          <Link href="/frontend" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            Frontend Prep
          </Link>
          <Link href="/goals" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            Goals
          </Link>
        </div>
      </header>

      <section className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <button
          type="button"
          onClick={() => setActiveTab("LEETCODE")}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
            activeTab === "LEETCODE" ? "bg-emerald-600 text-white" : "border border-slate-300 text-slate-700"
          }`}
        >
          LeetCode Bank
        </button>
        {Object.entries(SD_TAB_TRACKS).map(([tabKey, tabDef]) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveTab(tabKey as Exclude<BankTabKey, "LEETCODE">)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              activeTab === tabKey ? "bg-sky-700 text-white" : "border border-slate-300 text-slate-700"
            }`}
          >
            {tabDef.label}
          </button>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Bank Items</h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, topic, pattern"
            className="w-full rounded-md border px-3 py-2 text-sm md:w-80"
          />
        </div>

        {activeTab === "LEETCODE" && (
          <div className="mb-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase text-slate-600">Company Filters</p>
              {leetcodeCompanies.map((company) => (
                <button
                  key={company.name}
                  type="button"
                  onClick={() => toggleCompanyFilter(company.name)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${companyPillClass(company.name)} ${
                    lcCompanyFilters.includes(company.name) ? "ring-2 ring-offset-1 ring-slate-500" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {company.name} ({company.count})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase text-slate-600">Pattern Category</p>
              <button
                type="button"
                onClick={() => setLcCategoryFilter("ALL")}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  lcCategoryFilter === "ALL" ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                ALL
              </button>
              {CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setLcCategoryFilter(category)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    lcCategoryFilter === category ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase text-slate-600">Pattern Focus</p>
              {availablePatterns.slice(0, 24).map((pattern) => (
                <button
                  key={pattern}
                  type="button"
                  onClick={() => togglePatternFilter(pattern)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    lcPatternFilters.includes(pattern)
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-emerald-300 bg-white text-emerald-700"
                  }`}
                >
                  {pattern}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">NeetCode-style grouping by pattern</p>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={lcGroupedView}
                  onChange={(e) => setLcGroupedView(e.target.checked)}
                />
                Grouped View
              </label>
            </div>
          </div>
        )}

        {!isLeetcodeTab && (
          <div className="mb-4 space-y-3 rounded-lg border border-sky-200 bg-sky-50/50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-600">{SD_TAB_TRACKS[activeTab as Exclude<BankTabKey, "LEETCODE">].label}</p>
            <p className="text-xs font-semibold uppercase text-slate-600">Group System Design By Concepts</p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSdConceptFilter("ALL")}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  sdConceptFilter === "ALL" ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                ALL
              </button>
              {sdConcepts.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => setSdConceptFilter(entry.name)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    sdConceptFilter === entry.name ? "border-sky-700 bg-sky-700 text-white" : "border-sky-300 bg-white text-sky-700"
                  }`}
                >
                  {entry.name} ({entry.count})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSdLevelFilter(level)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    sdLevelFilter === level ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No items in this bank yet.</p>
        ) : isLeetcodeTab ? (
          lcGroupedView ? (
            <div className="space-y-4">
              {leetcodeGroups.length === 0 ? (
                <p className="text-sm text-slate-500">No LeetCode items match the current filters.</p>
              ) : (
                leetcodeGroups.map((group) => (
                  <div key={`${group.category}:${group.pattern}`} className="rounded-md border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {group.category} · {group.pattern}
                      </p>
                      <span className="text-xs text-slate-500">{group.items.length} problems</span>
                    </div>
                    <ul className="space-y-2 p-3">
                      {group.items.map((item) => (
                        <li key={item.id} className="rounded-md border border-slate-200 px-3 py-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500">{item.difficulty ?? "-"} · {item.pattern ?? "-"}</p>
                              <p className="mt-1 text-xs text-slate-600">
                                Attempts: {item.attemptCount ?? 0} · Last solved: {formatDate(item.lastSolvedAt)}
                              </p>
                              {companySignalsFromItem(item).length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {companySignalsFromItem(item)
                                    .slice(0, 5)
                                    .map((company) => (
                                      <span
                                        key={`${item.id}:${company.name}`}
                                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${companyPillClass(company.name)}`}
                                      >
                                        {company.score !== null ? `${company.name} ${company.score}` : company.name}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link href={`/items/${item.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                                Open Item
                              </Link>
                              <button
                                type="button"
                                disabled={updatingItemId === item.id}
                                onClick={() =>
                                  void patchItem(item.id, {
                                    attemptCount: (item.attemptCount ?? 0) + 1,
                                    lastAttemptedAt: new Date().toISOString(),
                                  })
                                }
                                className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                              >
                                +1 Attempt
                              </button>
                              <button
                                type="button"
                                disabled={updatingItemId === item.id}
                                onClick={() =>
                                  void patchItem(item.id, {
                                    attemptCount: Math.max(1, (item.attemptCount ?? 0) + 1),
                                    lastAttemptedAt: new Date().toISOString(),
                                    lastSolvedAt: new Date().toISOString(),
                                    leetcodeOutcome: "SOLVED",
                                  })
                                }
                                className="rounded-md border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700 disabled:opacity-50"
                              >
                                Mark Solved Today
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredLeetcode.map((item) => (
                <li key={item.id} className="rounded-md border border-slate-200 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.difficulty ?? "-"} · {item.pattern ?? "-"}</p>
                    </div>
                    <Link href={`/items/${item.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                      Open Item
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="space-y-4">
            {groupedSystemDesign.length === 0 ? (
              <p className="text-sm text-slate-500">No System Design items match the current filters.</p>
            ) : (
              groupedSystemDesign.map((conceptGroup) => (
                <div key={conceptGroup.concept} className={`rounded-md border ${sdTrackTone(activeSystemTrack ?? "untracked")}`}>
                  <div className="flex items-center justify-between border-b border-white/70 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{conceptGroup.concept}</p>
                    <span className="text-xs text-slate-600">{conceptGroup.entries.length} items</span>
                  </div>
                  <ul className="space-y-2 p-3">
                    {conceptGroup.entries.map(({ item, level, track }) => (
                      <li key={item.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500">{track} · {item.systemTopic ?? "-"}</p>
                            <span
                              className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                level === "EASY"
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                  : level === "MEDIUM"
                                    ? "border-amber-300 bg-amber-100 text-amber-700"
                                    : "border-rose-300 bg-rose-100 text-rose-700"
                              }`}
                            >
                              {level}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/items/${item.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                              Open Item
                            </Link>
                            <Link
                              href={`/bank/system-design/${item.id}`}
                              className="rounded-md border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-700"
                            >
                              Edit Markdown
                            </Link>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            Add Record ({isLeetcodeTab ? "LeetCode" : "System Design"})
          </summary>
          <p className="mt-2 text-xs text-slate-600">
            Use this dedicated section when you want to add new canonical items to the active bank.
          </p>
          <div className="mt-3">{createRecordPanel}</div>
        </details>
      </section>

      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
