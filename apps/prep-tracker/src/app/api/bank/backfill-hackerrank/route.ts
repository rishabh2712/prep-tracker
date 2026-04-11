import { NextResponse } from "next/server";
import { backfillUberHackerRankDerived } from "@/lib/storage";

export async function POST() {
  try {
    const result = await backfillUberHackerRankDerived();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to backfill HackerRank overlap items" },
      { status: 500 }
    );
  }
}
