"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import type { SystemDesignMarkdownDoc } from "@/lib/types";

type Props = {
  itemId: string;
};

export function SystemDesignMarkdownClient({ itemId }: Props) {
  const [doc, setDoc] = useState<SystemDesignMarkdownDoc | null>(null);
  const [content, setContent] = useState("");
  const [checksum, setChecksum] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/system-design/${itemId}/markdown`, { cache: "no-store" });
      const json = (await response.json()) as { doc?: SystemDesignMarkdownDoc; error?: string };
      if (!response.ok || !json.doc) {
        throw new Error(json.error ?? "Unable to load markdown");
      }

      setDoc(json.doc);
      setContent(json.doc.content);
      setChecksum(json.doc.checksum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load markdown");
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/system-design/${itemId}/markdown`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, expectedChecksum: checksum }),
      });

      const json = (await response.json()) as {
        doc?: SystemDesignMarkdownDoc;
        current?: SystemDesignMarkdownDoc;
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 409 && json.current) {
          setDoc(json.current);
          setContent(json.current.content);
          setChecksum(json.current.checksum);
          throw new Error("File changed externally. Latest file has been loaded. Re-apply your edits and save again.");
        }

        throw new Error(json.error ?? "Unable to save markdown");
      }

      if (json.doc) {
        setDoc(json.doc);
        setChecksum(json.doc.checksum);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save markdown");
    } finally {
      setBusy(false);
    }
  }

  if (!doc) {
    return <p className="text-sm text-slate-500">Loading markdown document...</p>;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/bank" className="text-xs font-semibold text-slate-500 hover:underline">
            ← Back to bank
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">System Design Markdown</h1>
          <p className="text-xs text-slate-500">File: {doc.path}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Reload
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save Markdown"}
          </button>
        </div>
      </header>

      <MarkdownEditor label="System Design Notes" value={content} onChange={setContent} minHeight={420} />

      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
