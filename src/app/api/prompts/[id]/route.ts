// src/app/api/prompts/[id]/route.ts
import { NextResponse } from "next/server";
import { deletePrompt, getPromptById, type PromptRecord } from "@/lib/promptStore";
import { getUserBySession } from "@/lib/userStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPublic(item: PromptRecord) {
  return {
    id: item.id,
    title: item.title,
    prompt: item.content,
    createdAt: item.created_at,
  };
}

async function getUserIdFromReq(req: Request): Promise<number | null> {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/pb_session=([A-Fa-f0-9]+);?/);
  const token = m ? m[1] : null;
  if (!token) return null;
  const user = await getUserBySession(token);
  return user ? user.id : null;
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

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const promptId = Number(id);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const prompt = await getPromptById(promptId);
    if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });

    const userId = await getUserIdFromReq(req);
    if (prompt.user_id !== null && (!userId || Number(userId) !== Number(prompt.user_id))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const removed = await deletePrompt(promptId);
    if (!removed) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Delete prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
