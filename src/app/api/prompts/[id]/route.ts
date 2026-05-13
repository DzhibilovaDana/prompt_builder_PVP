import { NextResponse } from "next/server";
import { deletePrompt, getPromptById, updatePrompt, type PromptRecord } from "@/lib/promptStore";
import { getRequestUser } from "@/lib/auth";
import { canEditPromptByUser, canReadPromptByUser } from "@/lib/promptAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePayload(body: Record<string, unknown>) {
  const categoryRaw = typeof body.category === "string" ? body.category.trim() : "";
  const category = categoryRaw ? categoryRaw.slice(0, 80) : null;
  const tags = Array.isArray(body.tags)
    ? Array.from(
        new Set(
          body.tags
            .map((tag) => String(tag).trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 20),
        ),
      )
    : [];
  const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? (body.metadata as Record<string, unknown>) : {};
  return { category, tags, metadata };
}

function toPublic(item: PromptRecord) {
  return {
    id: item.id,
    workspaceId: item.workspace_id,
    title: item.title,
    prompt: item.content,
    category: item.category,
    tags: item.tags,
    metadata: item.metadata,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const promptId = Number(id);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const prompt = await getPromptById(promptId);
    if (!prompt) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const allowed = await canReadPromptByUser(prompt, user.id);
    if (!allowed) return NextResponse.json({ error: "not found" }, { status: 404 });

    return NextResponse.json(toPublic(prompt));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Get prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const promptId = Number(id);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : typeof body.prompt === "string"
          ? body.prompt.trim()
          : "";
    const { category, tags, metadata } = normalizePayload(body);

    if (!title || !content) {
      return NextResponse.json({ error: "title and prompt (or content) are required" }, { status: 400 });
    }

    const prompt = await getPromptById(promptId);
    if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });

    const allowed = await canEditPromptByUser(prompt, user.id);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const updated = await updatePrompt(promptId, title, content, user.id, { category, tags, metadata });
    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json(toPublic(updated));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const promptId = Number(id);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const prompt = await getPromptById(promptId);
    if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });

    const allowed = await canEditPromptByUser(prompt, user.id);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const removed = await deletePrompt(promptId, user.id);
    if (!removed) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Delete prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
