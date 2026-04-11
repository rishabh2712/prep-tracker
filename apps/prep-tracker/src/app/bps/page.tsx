import { Suspense } from "react";
import { BpsSeriesClient } from "@/components/bps-series-client";

export default function BpsPage() {
  return (
    <Suspense fallback={<div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400">Loading BPS program…</div>}>
      <BpsSeriesClient />
    </Suspense>
  );
}
