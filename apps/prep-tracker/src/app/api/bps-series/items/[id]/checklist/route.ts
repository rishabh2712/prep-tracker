import { NextResponse } from "next/server";
import { BPS_SERIES_CONFIG, checklistFromItem } from "@/lib/bps-series";
import { frontendMeta } from "@/lib/frontend-bank";
import { getItem, updateItem } from "@/lib/storage";
import { bpsChecklistUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const payload = bpsChecklistUpdateSchema.parse(json);

    if (payload.programId !== BPS_SERIES_CONFIG.programId) {
      return NextResponse.json({ error: "Unsupported BPS program" }, { status: 400 });
    }

    const item = await getItem(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!frontendMeta(item)) {
      return NextResponse.json({ error: "BPS checklist is only supported for frontend-bank items" }, { status: 400 });
    }

    const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata : {};
    const existingBps =
      metadata.bps && typeof metadata.bps === "object" && !Array.isArray(metadata.bps)
        ? metadata.bps
        : {};
    const mergedMetadata = {
      ...metadata,
      bps: {
        ...existingBps,
        programId: payload.programId,
        sessionId: payload.sessionId,
        rubricReviewed: payload.rubricReviewed,
        updatedAt: new Date().toISOString(),
      },
    };

    const updated = await updateItem(id, { metadata: mergedMetadata });
    if (!updated) {
      return NextResponse.json({ error: "Unable to update item" }, { status: 404 });
    }

    return NextResponse.json({
      item: updated,
      checklist: checklistFromItem(updated, payload.sessionId),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
