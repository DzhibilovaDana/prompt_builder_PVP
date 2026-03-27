import { NextResponse } from "next/server";
import { trackAbResult } from "@/lib/abTestStore";
import { getRequestUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(req);
    if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const testId = Number(id);
    if (!Number.isInteger(testId) || testId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const variantLabel = typeof body.variantLabel === "string" ? body.variantLabel.trim() : "";
    const success = Boolean(body.success);

    if (!variantLabel) {
      return NextResponse.json({ error: "variantLabel is required" }, { status: 400 });
    }

    await trackAbResult(testId, variantLabel, success);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Track A/B result error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
