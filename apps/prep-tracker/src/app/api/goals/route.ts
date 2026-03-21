import { NextResponse } from "next/server";
import { createGoalRecord, listGoalRecords } from "@/lib/storage";
import { goalCreateSchema } from "@/lib/validators";

export async function GET() {
  const goals = await listGoalRecords();
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = goalCreateSchema.parse(json);
    const goal = await createGoalRecord(payload);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
