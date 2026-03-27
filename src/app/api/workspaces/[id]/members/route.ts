import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { getUserByEmail } from "@/lib/userStore";
import { createAuditLog } from "@/lib/promptStore";
import { addWorkspaceMember, getWorkspaceRole, listWorkspaceMembers, type WorkspaceRole } from "@/lib/workspaceStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLE_PRIORITY: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const workspaceId = Number(id);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      return NextResponse.json({ error: "invalid workspace id" }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "auth required" }, { status: 401 });
    }

    const role = await getWorkspaceRole(workspaceId, userId);
    if (!role) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const members = await listWorkspaceMembers(workspaceId);
    return NextResponse.json({ workspaceId, members });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List members error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const workspaceId = Number(id);

    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      return NextResponse.json({ error: "invalid workspace id" }, { status: 400 });
    }

    const actorUserId = await getUserIdFromRequest(req);
    if (!actorUserId) {
      return NextResponse.json({ error: "auth required" }, { status: 401 });
    }

    const actorRole = await getWorkspaceRole(workspaceId, actorUserId);
    if (!actorRole || ROLE_PRIORITY[actorRole] < ROLE_PRIORITY.admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const targetUserId = typeof body.userId === "number" && Number.isInteger(body.userId) && body.userId > 0 ? body.userId : null;
    const targetEmail = typeof body.email === "string" ? body.email.trim() : "";
    const role = typeof body.role === "string" ? (body.role as WorkspaceRole) : "viewer";

    if (!["owner", "admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json({ error: "invalid role" }, { status: 400 });
    }

    let resolvedUserId = targetUserId;
    if (!resolvedUserId && targetEmail) {
      const user = await getUserByEmail(targetEmail);
      resolvedUserId = user?.id ?? null;
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: "target user not found" }, { status: 404 });
    }

    const created = await addWorkspaceMember(workspaceId, resolvedUserId, role);
    await createAuditLog("workspace_member", `${workspaceId}:${resolvedUserId}`, "upserted", actorUserId, {
      workspaceId,
      targetUserId: resolvedUserId,
      role,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Add member error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
