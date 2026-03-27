import { NextResponse } from "next/server";
import { getPromptById, getPromptMetrics } from "@/lib/promptStore";
import { getRequestUser } from "@/lib/auth";

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
    if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });

    const user = await getRequestUser(req);
    if (prompt.user_id !== null && (!user || Number(user.id) !== Number(prompt.user_id))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const metrics = await getPromptMetrics(promptId);
    return NextResponse.json({ promptId, metrics });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Prompt metrics error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
