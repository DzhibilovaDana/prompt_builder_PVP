import { NextResponse } from "next/server";
import { createAbTest, listAbTests } from "@/lib/abTestStore";
import { getUserIdFromRequest } from "@/lib/auth";
import { createAuditLog } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workspaceIdRaw = url.searchParams.get("workspaceId");
    const workspaceId = workspaceIdRaw ? Number(workspaceIdRaw) : null;

    const tests = await listAbTests(workspaceId && Number.isInteger(workspaceId) && workspaceId > 0 ? workspaceId : null);
    return NextResponse.json(tests);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List A/B tests error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const goal = typeof body.goal === "string" ? body.goal.trim() : null;
    const workspaceId = typeof body.workspaceId === "number" && Number.isInteger(body.workspaceId) && body.workspaceId > 0 ? body.workspaceId : null;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(req);
    const created = await createAbTest(name, goal, userId ?? null, workspaceId);
    await createAuditLog("ab_test", String(created.id), "created", userId ?? null, {
      workspaceId: created.workspace_id,
      name: created.name,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create A/B test error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
