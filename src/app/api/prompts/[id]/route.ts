// src/app/api/prompts/[id]/route.ts
import { NextResponse } from "next/server";
import { deletePrompt, getPromptById, updatePrompt, type PromptRecord } from "@/lib/promptStore";
import { getUserIdFromRequest } from "@/lib/auth";
import { getWorkspaceRole } from "@/lib/workspaceStore";

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

async function hasPromptWriteAccess(req: Request, prompt: PromptRecord): Promise<boolean> {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return prompt.user_id == null;
  }

  if (prompt.user_id != null && Number(prompt.user_id) === Number(userId)) {
    return true;
  }

  if (prompt.workspace_id != null) {
    const role = await getWorkspaceRole(prompt.workspace_id, userId);
    if (role === "owner" || role === "admin" || role === "editor") {
      return true;
    }
  }

  return false;
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

    const prompt = await getPromptById(promptId);
    if (!prompt) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    if (!(await hasPromptWriteAccess(req, prompt))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : prompt.title;
    const content = typeof body.content === "string" ? body.content.trim() : typeof body.prompt === "string" ? body.prompt.trim() : prompt.content;
    const changeNote = typeof body.changeNote === "string" ? body.changeNote.trim() : "updated via API";

    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(req);
    const updated = await updatePrompt(promptId, title, content, userId ?? null, changeNote);
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

    if (!(await hasPromptWriteAccess(req, prompt))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const userId = await getUserIdFromRequest(req);
    const removed = await deletePrompt(promptId, userId ?? null);
    if (!removed) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Delete prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
