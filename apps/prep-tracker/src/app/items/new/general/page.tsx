import Link from "next/link";
import { GeneralCreateForm } from "@/components/create/general-create-form";
import { PageSurface } from "@/components/page-surface";

export default function NewGeneralPage() {
  return (
    <PageSurface className="max-w-6xl">
      <div className="space-y-5">
        <header>
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline">← Back to dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">New General Record</h1>
          <p className="text-sm text-slate-600">For behavioral, mock interviews, CS fundamentals, projects, and misc prep.</p>
        </header>
        <GeneralCreateForm />
      </div>
    </PageSurface>
  );
}
