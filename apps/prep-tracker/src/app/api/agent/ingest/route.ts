import { NextResponse } from "next/server";
import { ingestAgentContent } from "@/lib/storage";
import { agentIngestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = agentIngestSchema.parse(json);
    const result = await ingestAgentContent(payload);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
