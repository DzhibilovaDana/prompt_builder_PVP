import { NextResponse } from "next/server";
import { createPrompt, listPrompts } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prompts = await listPrompts();
    return NextResponse.json(prompts);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List prompts error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { title?: unknown; content?: unknown };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }

    const created = await createPrompt(title, content);
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
