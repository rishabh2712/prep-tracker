import { Suspense } from "react";
import { PrepSprint60Client } from "@/components/prepsprint-60-client";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400">Loading prep workspace…</div>}>
      <PrepSprint60Client />
    </Suspense>
  );
}
