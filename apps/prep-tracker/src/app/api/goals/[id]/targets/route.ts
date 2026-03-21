import { NextResponse } from "next/server";
import {
  deleteGoalTarget,
  listGoalTargets,
  replaceGoalTargets,
  upsertGoalTarget,
} from "@/lib/storage";
import {
  goalTargetDeleteSchema,
  goalTargetReplaceSchema,
  goalTargetUpsertSchema,
} from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const targets = await listGoalTargets(id);
  if (!targets) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }
  return NextResponse.json({ targets });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const json = await request.json();
    const payload = goalTargetUpsertSchema.parse(json);
    const targets = await upsertGoalTarget(id, payload);
    if (!targets) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    return NextResponse.json({ targets }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const json = await request.json();
    const payload = goalTargetReplaceSchema.parse(json);
    const targets = await replaceGoalTargets(id, payload);
    if (!targets) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    return NextResponse.json({ targets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const json = await request.json();
    const payload = goalTargetDeleteSchema.parse(json);
    const deleted = await deleteGoalTarget(id, payload);
    if (!deleted) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}

