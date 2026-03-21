import { NextResponse } from "next/server";
import { DuplicateItemError, getItem, hardDeleteItem, softDeleteItem, updateItem } from "@/lib/storage";
import { itemUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const item = await getItem(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const payload = itemUpdateSchema.parse(json);
    const item = await updateItem(id, payload);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof DuplicateItemError) {
      return NextResponse.json(
        {
          error: error.message,
          existingId: error.existingId,
          existingDeleted: error.existingDeleted,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const item = await softDeleteItem(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await hardDeleteItem(id);
  if (!deleted) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
