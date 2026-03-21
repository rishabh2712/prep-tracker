import { NextResponse } from "next/server";
import { getRecentChanges, getStats } from "@/lib/storage";

export async function GET() {
  const [stats, recentChanges] = await Promise.all([getStats(), getRecentChanges(25)]);
  return NextResponse.json({ stats, recentChanges });
}
