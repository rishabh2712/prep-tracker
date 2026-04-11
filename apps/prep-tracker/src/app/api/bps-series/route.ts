import { NextResponse } from "next/server";
import { hydrateBpsSeries } from "@/lib/bps-series";
import { listItems, listMockInterviewProgress } from "@/lib/storage";

export async function GET() {
  try {
    const [items, mockProgress] = await Promise.all([listItems({ type: "ALL" }), listMockInterviewProgress()]);
    const response = hydrateBpsSeries(items, mockProgress);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load BPS series" },
      { status: 500 }
    );
  }
}
