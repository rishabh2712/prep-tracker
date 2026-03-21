import { NextResponse } from "next/server";
import { addReview, getReviewsForItem } from "@/lib/storage";
import { reviewSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const reviews = await getReviewsForItem(id);
  return NextResponse.json({ reviews });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const payload = reviewSchema.parse(json);
    const result = await addReview(id, payload, payload.goalId);

    if (!result) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
