import { NextResponse } from "next/server";
import { addGoalDayEntry, removeGoalDayEntry } from "@/lib/storage";
import { goalDayEntryCreateSchema, goalDayEntryDeleteSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ dayId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { dayId } = await context.params;

  try {
    const json = await request.json();
    const payload = goalDayEntryCreateSchema.parse(json);
    const result = await addGoalDayEntry(dayId, payload);

    if (!result) {
      return NextResponse.json({ error: "Day or item not found for this goal" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { dayId } = await context.params;

  try {
    const json = await request.json();
    const payload = goalDayEntryDeleteSchema.parse(json);
    const result = await removeGoalDayEntry(dayId, payload.entryId);

    if (!result) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
