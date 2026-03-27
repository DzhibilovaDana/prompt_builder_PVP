import { NextResponse } from "next/server";
import { createPromptScore, getPromptById } from "@/lib/promptStore";
import { getRequestUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const promptId = Number(id);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const prompt = await getPromptById(promptId);
    if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });

    const user = await getRequestUser(req);
    if (prompt.user_id !== null && (!user || Number(user.id) !== Number(prompt.user_id))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const score = typeof body.score === "number" ? body.score : Number(body.score);
    const runId = typeof body.runId === "number" ? body.runId : body.runId ? Number(body.runId) : null;
    const note = typeof body.note === "string" ? body.note.trim() : null;

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: "score must be integer 1..5" }, { status: 400 });
    }

    const scoreId = await createPromptScore({
      promptId,
      runId,
      userId: user?.id ?? null,
      score,
      note,
    });

    return NextResponse.json({ ok: true, scoreId }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create score error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
