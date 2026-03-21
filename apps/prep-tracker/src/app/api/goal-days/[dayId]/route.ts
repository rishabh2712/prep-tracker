import { NextResponse } from "next/server";
import { updateGoalDay } from "@/lib/storage";
import { goalDayUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ dayId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { dayId } = await context.params;

  try {
    const json = await request.json();
    const payload = goalDayUpdateSchema.parse(json);
    const day = await updateGoalDay(dayId, payload);

    if (!day) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    return NextResponse.json({ day });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
