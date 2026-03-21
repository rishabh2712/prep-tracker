import { NextResponse } from "next/server";
import { DuplicateItemError, listItems, createItem } from "@/lib/storage";
import type { ItemType } from "@/lib/types";
import { itemCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const type = searchParams.get("type") as ItemType | "ALL" | undefined;
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  const dueOnly = searchParams.get("dueOnly") === "true";
  const shouldReviewOnly = searchParams.get("shouldReviewOnly") === "true";

  const items = await listItems({ q, type, includeDeleted, dueOnly, shouldReviewOnly });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = itemCreateSchema.parse(json);
    const item = await createItem(payload);
    return NextResponse.json({ item }, { status: 201 });
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
