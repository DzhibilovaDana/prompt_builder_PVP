import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { createPromptScore, listPromptScores } from "@/lib/metricsStore";
import { getPromptById } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const scores = await listPromptScores(promptId, limit);
    return NextResponse.json({ promptId, scores });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List scores error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const score = Number(body.score);

    if (!Number.isFinite(score)) {
      return NextResponse.json({ error: "score is required" }, { status: 400 });
    }

    const runId = Number(body.runId);
    const criteria = typeof body.criteria === "string" ? body.criteria : null;
    const note = typeof body.note === "string" ? body.note : null;
    const userId = await getUserIdFromRequest(req);

    const created = await createPromptScore(
      promptId,
      score,
      userId ?? null,
      Number.isInteger(runId) && runId > 0 ? runId : null,
      criteria,
      note
    );

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create score error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
