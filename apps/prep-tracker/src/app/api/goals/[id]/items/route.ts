import { NextResponse } from "next/server";
import { addItemToGoal, listGoalItems, removeItemFromGoal } from "@/lib/storage";
import { goalItemAddSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const items = await listGoalItems(id);
  return NextResponse.json({ items });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const payload = goalItemAddSchema.parse(json);
    const result = await addItemToGoal(id, payload.itemId);

    if (!result) {
      return NextResponse.json({ error: "Goal or item not found" }, { status: 404 });
    }

    return NextResponse.json({ result }, { status: 201 });
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
    const body = await request.json();
    const payload = goalItemAddSchema.parse(body);
    const removed = await removeItemFromGoal(id, payload.itemId);

    if (!removed) {
      return NextResponse.json({ error: "Goal item not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
