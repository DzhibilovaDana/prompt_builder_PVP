import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { addWorkspaceMember, canManageWorkspace, type WorkspaceRole } from "@/lib/workspaceStore";
import { getUserByEmail } from "@/lib/userStore";
import { addAuditLog } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRole(value: unknown): WorkspaceRole | null {
  if (value === "owner" || value === "admin" || value === "editor" || value === "viewer") {
    return value;
  }
  return null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getRequestUser(req);
    if (!currentUser?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const workspaceId = Number(id);
    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      return NextResponse.json({ error: "invalid workspace id" }, { status: 400 });
    }

    const canManage = await canManageWorkspace(workspaceId, currentUser.id);
    if (!canManage) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = (await req.json()) as Record<string, unknown>;
    const role = parseRole(body.role);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !role) {
      return NextResponse.json({ error: "email and role are required" }, { status: 400 });
    }

    const targetUser = await getUserByEmail(email);
    if (!targetUser) return NextResponse.json({ error: "user not found" }, { status: 404 });

    await addWorkspaceMember(workspaceId, targetUser.id, role);
    await addAuditLog({
      entityType: "workspace_member",
      entityId: workspaceId,
      action: "upsert",
      actorUserId: currentUser.id,
      workspaceId,
      metadata: { targetUserId: targetUser.id, role },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Workspace member update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
