import { NextResponse } from "next/server";
import { createGoalSession, listGoalSessions } from "@/lib/storage";
import { goalSessionCreateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") ?? 30);
  const sessions = await listGoalSessions(id, Number.isFinite(limitRaw) ? limitRaw : 30);
  if (!sessions) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  return NextResponse.json({ sessions });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const json = await request.json();
    const payload = goalSessionCreateSchema.parse(json);
    const session = await createGoalSession(id, payload);
    if (!session) {
      return NextResponse.json({ error: "Unable to create goal session" }, { status: 404 });
    }
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}

