import { NextResponse } from "next/server";
import { listUberDays } from "@/lib/uber-day-tracker";

export async function GET() {
  const days = await listUberDays();
  return NextResponse.json({ days });
}
