import { NextResponse } from "next/server";
import { UBER_DSA_MOCK_QUESTION_IDS } from "@/lib/mock-interview-dsa";
import { addMockInterviewReview, listMockInterviewReviews } from "@/lib/storage";
import { mockInterviewReviewSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!UBER_DSA_MOCK_QUESTION_IDS.has(id)) {
    return NextResponse.json({ error: "Unknown mock interview question" }, { status: 404 });
  }

  try {
    const json = await request.json();
    const payload = mockInterviewReviewSchema.parse(json);
    const result = await addMockInterviewReview(id, payload);
    return NextResponse.json(result);
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

  const reviews = await listMockInterviewReviews(id);
  return NextResponse.json({ reviews });
}
