import { NextResponse } from "next/server";
import { getPromptById, listPromptVersions } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const versions = await listPromptVersions(promptId);
    return NextResponse.json({ promptId, versions });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List versions error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
