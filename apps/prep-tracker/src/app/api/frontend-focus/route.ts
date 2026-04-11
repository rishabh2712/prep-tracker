import { NextResponse } from "next/server";
import { buildFrontendFocusResponse } from "@/lib/frontend-focus";
import { listFrontendFocusProgress } from "@/lib/storage";

export async function GET() {
  const progress = await listFrontendFocusProgress();
  return NextResponse.json(buildFrontendFocusResponse(progress));
}
