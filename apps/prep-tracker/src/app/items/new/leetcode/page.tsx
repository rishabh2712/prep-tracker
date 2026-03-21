import Link from "next/link";
import { LeetcodeCreateForm } from "@/components/create/leetcode-create-form";
import { PageSurface } from "@/components/page-surface";

export default function NewLeetcodePage() {
  return (
    <PageSurface className="max-w-6xl">
      <div className="space-y-5">
        <header>
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline">← Back to dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">New LeetCode Record</h1>
          <p className="text-sm text-slate-600">Focused form for coding-problem tracking and revisit planning.</p>
        </header>
        <LeetcodeCreateForm />
      </div>
    </PageSurface>
  );
}
