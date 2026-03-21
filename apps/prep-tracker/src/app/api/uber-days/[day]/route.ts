import { NextResponse } from "next/server";
import { updateUberDay } from "@/lib/uber-day-tracker";
import { uberDayUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ day: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { day } = await context.params;
  const numericDay = Number(day);
  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > 45) {
    return NextResponse.json({ error: "Day must be between 1 and 45" }, { status: 400 });
  }

  try {
    const json = await request.json();
    const payload = uberDayUpdateSchema.parse(json);
    const record = await updateUberDay(numericDay, payload);

    if (!record) {
      return NextResponse.json({ error: "Day record not found" }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
