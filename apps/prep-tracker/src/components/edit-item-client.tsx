"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemForm, type ItemPayload } from "@/components/item-form";
import type { PrepItem } from "@/lib/types";

type EditItemClientProps = {
  itemId: string;
};

export function EditItemClient({ itemId }: EditItemClientProps) {
  const router = useRouter();
  const [item, setItem] = useState<PrepItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/items/${itemId}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Unable to load item");
      }
      setItem(json.item as PrepItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load item");
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(payload: ItemPayload) {
    const response = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "Unable to update item");
    }

    router.push(`/items/${itemId}`);
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (error || !item) {
    return <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error ?? "Item not found"}</p>;
  }

  if (item.isShared) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          Shared bank items stay canonical for everyone. Use the item detail view to log reviews, notes, and personal progress instead of editing the source prompt here.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/items/${itemId}`)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          Back to item
        </button>
      </div>
    );
  }

  return <ItemForm mode="edit" initial={item} onSubmit={handleSubmit} onCancel={() => router.push(`/items/${itemId}`)} />;
}
