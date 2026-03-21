import { NextResponse } from "next/server";
import { listPrepPackets } from "@/lib/prep-packets";

export async function GET() {
  const packets = await listPrepPackets();
  return NextResponse.json({ packets });
}
