// src/app/api/prompts/route.ts
import { NextResponse } from "next/server";
import { createPrompt, listPrompts } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Helper: map internal PromptRecord -> external shape expected by UI
 * { id, title, content, created_at } => { id, title, prompt, createdAt }
 */
function toPublic(item: any) {
  return {
    id: item.id,
    title: item.title,
    prompt: item.content ?? item.prompt ?? "",
    createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const prompts = await listPrompts();
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
    // Support both { content } and { prompt } from different clients
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

    const created = await createPrompt(title, content);
    return NextResponse.json(toPublic(created), { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
