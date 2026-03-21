import Link from "next/link";
import { PageSurface } from "@/components/page-surface";

const options = [
  {
    href: "/items/new/leetcode",
    title: "LeetCode",
    description: "Track problem link, attempts, confidence, revisit schedule, and solution notes.",
  },
  {
    href: "/items/new/system-design",
    title: "System Design",
    description: "Use the full architecture template: requirements, scale, failure modes, and tradeoffs.",
  },
  {
    href: "/items/new/lld",
    title: "LLD",
    description: "Dedicated low-level design form with component-level and API/data model sections.",
  },
  {
    href: "/items/new/general",
    title: "General",
    description: "For behavioral stories, mock interviews, CS fundamentals, projects, and misc prep.",
  },
];

export default function NewItemPage() {
  return (
    <PageSurface className="max-w-5xl">
      <div className="space-y-5">
        <header>
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline">
            ← Back to dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Choose Record Type</h1>
          <p className="text-sm text-slate-600">Each type has a dedicated create form. No mixed conditional form.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {options.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-900">{option.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{option.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </PageSurface>
  );
}
