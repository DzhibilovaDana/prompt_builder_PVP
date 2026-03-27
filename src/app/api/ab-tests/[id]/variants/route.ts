import { NextResponse } from "next/server";
import { listAbVariants, upsertVariant } from "@/lib/abTestStore";
import { getUserIdFromRequest } from "@/lib/auth";
import { createAuditLog } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const testId = Number(id);

    if (!Number.isInteger(testId) || testId <= 0) {
      return NextResponse.json({ error: "invalid test id" }, { status: 400 });
    }

    const variants = await listAbVariants(testId);
    return NextResponse.json({ testId, variants });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List variants error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const testId = Number(id);

    if (!Number.isInteger(testId) || testId <= 0) {
      return NextResponse.json({ error: "invalid test id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const variantKey = typeof body.variantKey === "string" ? body.variantKey.trim() : "";
    const promptId = typeof body.promptId === "number" && Number.isInteger(body.promptId) && body.promptId > 0 ? body.promptId : null;
    const trafficPercent = Number(body.trafficPercent);

    if (!variantKey) {
      return NextResponse.json({ error: "variantKey is required" }, { status: 400 });
    }

    if (!Number.isFinite(trafficPercent)) {
      return NextResponse.json({ error: "trafficPercent is required" }, { status: 400 });
    }

    const variant = await upsertVariant(testId, variantKey, promptId, trafficPercent);
    const userId = await getUserIdFromRequest(req);

    await createAuditLog("ab_variant", `${testId}:${variant.variant_key}`, "upserted", userId ?? null, {
      testId,
      promptId: variant.prompt_id,
      trafficPercent: variant.traffic_percent,
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upsert variant error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
