import Link from "next/link";
import { EditItemClient } from "@/components/edit-item-client";
import { PageSurface } from "@/components/page-surface";

type EditItemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditItemPage({ params }: EditItemPageProps) {
  const { id } = await params;

  return (
    <PageSurface className="max-w-6xl">
      <div className="space-y-5">
        <header>
          <Link href={`/items/${id}`} className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline">
            ← Back to record
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Edit Record</h1>
        </header>

        <EditItemClient itemId={id} />
      </div>
    </PageSurface>
  );
}
