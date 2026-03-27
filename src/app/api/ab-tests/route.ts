import { NextResponse } from "next/server";
import { createAbTest, listAbTests } from "@/lib/abTestStore";
import { getRequestUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const workspaceIdRaw = new URL(req.url).searchParams.get("workspaceId");
    const workspaceId = workspaceIdRaw ? Number(workspaceIdRaw) : null;
    const items = await listAbTests(workspaceId && Number.isInteger(workspaceId) ? workspaceId : null);
    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List A/B tests error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getRequestUser(req);
    if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const workspaceId = typeof body.workspaceId === "number" && Number.isInteger(body.workspaceId) ? body.workspaceId : null;
    const promptId = typeof body.promptId === "number" && Number.isInteger(body.promptId) ? body.promptId : null;
    const variants = Array.isArray(body.variants)
      ? body.variants
          .map((v) => {
            if (typeof v !== "object" || v == null) return null;
            const row = v as Record<string, unknown>;
            if (typeof row.label !== "string" || typeof row.promptText !== "string") return null;
            return { label: row.label.trim(), promptText: row.promptText.trim() };
          })
          .filter((v): v is { label: string; promptText: string } => Boolean(v && v.label && v.promptText))
      : [];

    if (!name || variants.length < 2) {
      return NextResponse.json({ error: "name and at least 2 variants are required" }, { status: 400 });
    }

    const id = await createAbTest({ workspaceId, name, promptId, createdBy: user.id, variants });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create A/B test error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
