import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { createWorkspace, listUserWorkspaces } from "@/lib/workspaceStore";
import { createAuditLog } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    const workspaces = await listUserWorkspaces(userId);
    return NextResponse.json(workspaces);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List workspaces error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "auth required" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const created = await createWorkspace(name, userId);
    await createAuditLog("workspace", String(created.id), "created", userId, { name: created.name });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create workspace error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
