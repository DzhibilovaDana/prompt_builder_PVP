import { NextResponse } from "next/server";
import { getPromptById } from "@/lib/promptStore";
import { getPromptMetricsSummary, listPromptRuns, listPromptScores } from "@/lib/metricsStore";

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

    const [summary, runs, scores] = await Promise.all([
      getPromptMetricsSummary(promptId),
      listPromptRuns(promptId, limit),
      listPromptScores(promptId, limit),
    ]);

    return NextResponse.json({ promptId, summary, runs, scores });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Metrics error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
