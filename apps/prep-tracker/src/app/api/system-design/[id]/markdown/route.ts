import { NextResponse } from "next/server";
import { getSystemDesignMarkdown, MarkdownConflictError, saveSystemDesignMarkdown } from "@/lib/storage";
import { markdownSaveSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const doc = await getSystemDesignMarkdown(id);

  if (!doc) {
    return NextResponse.json({ error: "System design note not found" }, { status: 404 });
  }

  return NextResponse.json({ doc });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const json = await request.json();
    const payload = markdownSaveSchema.parse(json);
    const doc = await saveSystemDesignMarkdown(id, payload);

    if (!doc) {
      return NextResponse.json({ error: "System design note not found" }, { status: 404 });
    }

    return NextResponse.json({ doc });
  } catch (error) {
    if (error instanceof MarkdownConflictError) {
      return NextResponse.json(
        { error: error.message, current: error.current },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request payload" },
      { status: 400 }
    );
  }
}
