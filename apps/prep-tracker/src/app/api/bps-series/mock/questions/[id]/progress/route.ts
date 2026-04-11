import { NextResponse } from "next/server";
import { UBER_DSA_MOCK_QUESTION_IDS } from "@/lib/mock-interview-dsa";
import { getMockInterviewProgress, upsertMockInterviewProgress } from "@/lib/storage";
import { mockInterviewProgressUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!UBER_DSA_MOCK_QUESTION_IDS.has(id)) {
    return NextResponse.json({ error: "Unknown mock interview question" }, { status: 404 });
  }

  try {
    const json = await request.json();
    const payload = mockInterviewProgressUpdateSchema.parse(json);
    const progress = await upsertMockInterviewProgress(id, payload);
    return NextResponse.json({ progress });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!UBER_DSA_MOCK_QUESTION_IDS.has(id)) {
    return NextResponse.json({ error: "Unknown mock interview question" }, { status: 404 });
  }

  const progress = await getMockInterviewProgress(id);
  return NextResponse.json({ progress });
}
