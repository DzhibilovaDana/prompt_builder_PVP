// src/app/api/prompts/route.ts
import { NextResponse } from "next/server";
import { createPrompt, listPrompts } from "@/lib/promptStore";
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

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromReq(req);
    const prompts = await listPrompts(userId ?? undefined);
    const mapped = Array.isArray(prompts) ? prompts.map(toPublic) : [];
    return NextResponse.json(mapped);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List prompts error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const contentCandidate =
      typeof body.content === "string"
        ? body.content.trim()
        : typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";
    const content = contentCandidate;

    if (!title || !content) {
      return NextResponse.json({ error: "title and prompt (or content) are required" }, { status: 400 });
    }

    const userId = await getUserIdFromReq(req);
    const created = await createPrompt(title, content, userId ?? null);
    return NextResponse.json(toPublic(created), { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
