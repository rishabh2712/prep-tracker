import { NextResponse } from "next/server";
import { listGoalDays } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const days = await listGoalDays(id);
  return NextResponse.json({ days });
}
