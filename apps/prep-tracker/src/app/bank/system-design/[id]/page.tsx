import { SystemDesignMarkdownClient } from "@/components/system-design-markdown-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SystemDesignMarkdownPage({ params }: Props) {
  const { id } = await params;
  return <SystemDesignMarkdownClient itemId={id} />;
}
