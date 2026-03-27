import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { createWorkspace, ensurePersonalWorkspace, listUserWorkspaces } from "@/lib/workspaceStore";
import { addAuditLog } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getRequestUser(req);
    if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    await ensurePersonalWorkspace(user.id, user.name);
    const workspaces = await listUserWorkspaces(user.id);
    return NextResponse.json({ items: workspaces });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List workspaces error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getRequestUser(req);
    if (!user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const workspace = await createWorkspace(name, user.id);
    await addAuditLog({
      entityType: "workspace",
      entityId: workspace.id,
      action: "create",
      actorUserId: user.id,
      workspaceId: workspace.id,
      metadata: { name: workspace.name },
    });
    return NextResponse.json(workspace, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create workspace error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
