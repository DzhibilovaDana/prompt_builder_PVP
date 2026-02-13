// src/app/api/prompts/[id]/route.ts
import { NextResponse } from "next/server";
import { deletePrompt, getPromptById } from "@/lib/promptStore";
import { getUserBySession } from "@/lib/userStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPublic(item: any) {
  return {
    id: item.id,
    title: item.title,
    prompt: item.content ?? item.prompt ?? "",
    createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
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

    // If prompt is private (has user_id) and not public, only owner can fetch it
    // For now we allow GET for all to support sharing. If you want stricter privacy, enforce auth here.

    return NextResponse.json(toPublic(prompt));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Get prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const promptId = Number(id);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const prompt = await getPromptById(promptId);
    if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });

    const userId = await getUserIdFromReq(_ as Request);
    // allow deletion if:
    // - prompt.user_id is null (public), OR
    // - userId === prompt.user_id
    if (prompt.user_id !== null) {
      if (!userId || Number(userId) !== Number(prompt.user_id)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    } else {
      // if public prompt, allow delete (or optionally restrict) — keep behavior for now
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
