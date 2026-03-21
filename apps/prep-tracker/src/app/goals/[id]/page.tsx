import { GoalDetailClient } from "@/components/goal-detail-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GoalDetailPage({ params }: Props) {
  const { id } = await params;
  return <GoalDetailClient goalId={id} />;
}
