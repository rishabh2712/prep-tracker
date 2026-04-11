import { NextResponse } from "next/server";
import { FRONTEND_FOCUS_QUESTION_IDS } from "@/lib/frontend-focus";
import { getFrontendFocusProgress, upsertFrontendFocusProgress } from "@/lib/storage";
import { frontendFocusProgressUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!FRONTEND_FOCUS_QUESTION_IDS.has(id)) {
    return NextResponse.json({ error: "Unknown frontend focus question" }, { status: 404 });
  }

  const progress = await getFrontendFocusProgress(id);
  return NextResponse.json({ progress });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!FRONTEND_FOCUS_QUESTION_IDS.has(id)) {
    return NextResponse.json({ error: "Unknown frontend focus question" }, { status: 404 });
  }

  try {
    const json = await request.json();
    const payload = frontendFocusProgressUpdateSchema.parse(json);
    const progress = await upsertFrontendFocusProgress(id, payload);
    return NextResponse.json({ progress });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
