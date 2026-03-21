"use client";

import { useRouter } from "next/navigation";
import { ItemForm, type ItemPayload } from "@/components/item-form";

export function NewItemClient() {
  const router = useRouter();

  async function handleSubmit(payload: ItemPayload) {
    const response = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error ?? "Unable to create item");
    }

    router.push(`/items/${json.item.id}`);
    router.refresh();
  }

  return <ItemForm mode="create" onSubmit={handleSubmit} onCancel={() => router.push("/")} />;
}
