import { NextResponse } from "next/server";
import { createItem, DuplicateItemError, listBankItems } from "@/lib/storage";
import { itemCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawKind = searchParams.get("kind") ?? "LEETCODE";
  const q = searchParams.get("q") ?? undefined;
  const kind = rawKind === "SYSTEM_DESIGN" ? "SYSTEM_DESIGN" : "LEETCODE";

  const items = await listBankItems(kind, q);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = itemCreateSchema.parse(json);

    if (payload.type !== "LEETCODE" && payload.type !== "SYSTEM_DESIGN") {
      return NextResponse.json({ error: "Bank only supports LEETCODE and SYSTEM_DESIGN" }, { status: 400 });
    }

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
