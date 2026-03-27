import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { getPromptById, rollbackPromptToVersion } from "@/lib/promptStore";
import { getWorkspaceRole } from "@/lib/workspaceStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

    const userId = await getUserIdFromRequest(req);
    let canWrite = false;
    if (prompt.user_id != null && userId && prompt.user_id === userId) {
      canWrite = true;
    } else if (prompt.workspace_id != null && userId) {
      const role = await getWorkspaceRole(prompt.workspace_id, userId);
      canWrite = role === "owner" || role === "admin" || role === "editor";
    }

    if (!canWrite) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const versionNo = Number(body.versionNo);

    if (!Number.isInteger(versionNo) || versionNo <= 0) {
      return NextResponse.json({ error: "versionNo is required" }, { status: 400 });
    }

    const updated = await rollbackPromptToVersion(promptId, versionNo, userId ?? null);
    if (!updated) {
      return NextResponse.json({ error: "version not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      prompt: updated.content,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      rollbackTo: versionNo,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Rollback prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
