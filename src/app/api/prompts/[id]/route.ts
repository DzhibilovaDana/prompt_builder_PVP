import { NextResponse } from "next/server";
import { deletePrompt, getPromptById, updatePrompt, type PromptRecord } from "@/lib/promptStore";
import { getRequestUser } from "@/lib/auth";
import { canWriteWorkspace } from "@/lib/workspaceStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPublic(item: PromptRecord) {
  return {
    id: item.id,
    workspaceId: item.workspace_id,
    title: item.title,
    prompt: item.content,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

async function canEditPrompt(req: Request, prompt: PromptRecord): Promise<boolean> {
  const user = await getRequestUser(req);
  if (!user?.id) return prompt.user_id === null;

  if (prompt.workspace_id) {
    return canWriteWorkspace(prompt.workspace_id, user.id);
  }

  return prompt.user_id === null || Number(user.id) === Number(prompt.user_id);
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
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

    return NextResponse.json(toPublic(prompt));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Get prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
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

    if (!title || !content) {
      return NextResponse.json({ error: "title and prompt (or content) are required" }, { status: 400 });
    }

    const prompt = await getPromptById(promptId);
    if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });

    const allowed = await canEditPrompt(req, prompt);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const user = await getRequestUser(req);
    const updated = await updatePrompt(promptId, title, content, user?.id ?? null);
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
    const { id } = await ctx.params;
    const promptId = Number(id);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const prompt = await getPromptById(promptId);
    if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });

    const allowed = await canEditPrompt(req, prompt);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const user = await getRequestUser(req);
    const removed = await deletePrompt(promptId, user?.id ?? null);
    if (!removed) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Delete prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
