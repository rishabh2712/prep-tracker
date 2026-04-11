import { Suspense } from "react";
import { FrontendFocusClient } from "@/components/frontend-focus-client";

export default function FrontendBankPage() {
  return (
    <Suspense fallback={<div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 text-sm text-zinc-400">Loading frontend prep…</div>}>
      <FrontendFocusClient />
    </Suspense>
  );
}
