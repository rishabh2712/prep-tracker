import { NextResponse } from "next/server";
import { deleteGoalSession } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string; sessionId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, sessionId } = await context.params;
  const deleted = await deleteGoalSession(id, sessionId);
  if (!deleted) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

