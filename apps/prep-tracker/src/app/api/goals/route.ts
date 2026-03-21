import { NextResponse } from "next/server";
import { createGoalRecord, getGoals, listGoalRecords, updateGoals } from "@/lib/storage";
import { goalCreateSchema, goalsUpdateSchema } from "@/lib/validators";

export async function GET() {
  const [goals, legacyGoals] = await Promise.all([listGoalRecords(), getGoals()]);
  return NextResponse.json({ goals, legacyGoals });
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

export async function PATCH(request: Request) {
  try {
    const json = await request.json();
    const payload = goalsUpdateSchema.parse(json);
    const goals = await updateGoals(payload);
    return NextResponse.json({ goals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
