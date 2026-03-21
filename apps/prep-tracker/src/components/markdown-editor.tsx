"use client";

import { useMemo, useState } from "react";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type MarkdownEditorProps = {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  minHeight?: number;
};

export function MarkdownEditor({
  label = "Markdown Notes",
  value,
  onChange,
  minHeight = 220,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"split" | "edit" | "preview">("split");
  const charCount = useMemo(() => value.length, [value]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="text-xs text-slate-500">Supports GitHub-style markdown and tables.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-1">
          {(["split", "edit", "preview"] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setMode(entry)}
              aria-pressed={mode === entry}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                mode === entry
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
            >
              {entry}
            </button>
          ))}
        </div>
      </header>

      <div
        className={`grid gap-0 ${mode === "split" ? "md:grid-cols-2" : "grid-cols-1"}`}
        style={{ minHeight }}
      >
        {(mode === "split" || mode === "edit") && (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="# Notes\n- Key insights\n- Tradeoffs\n- Next steps"
            className="min-h-[220px] w-full resize-y border-b border-slate-200 p-4 font-mono text-sm text-slate-900 outline-none md:border-b-0 md:border-r"
          />
        )}

        {(mode === "split" || mode === "preview") && (
          <div className="max-h-[520px] overflow-auto p-4">
            <MarkdownRenderer content={value} tone="light" className="text-sm leading-6 text-slate-800" />
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
        <span>{charCount} characters</span>
        <span>{mode === "split" ? "Edit and preview side by side" : mode === "edit" ? "Editor only" : "Preview only"}</span>
      </footer>
    </section>
  );
}
