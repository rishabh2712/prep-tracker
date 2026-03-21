import { ItemDetailClient } from "@/components/item-detail-client";
import { PageSurface } from "@/components/page-surface";

type ItemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params;
  return (
    <PageSurface className="max-w-[88rem]">
      <ItemDetailClient itemId={id} />
    </PageSurface>
  );
}
