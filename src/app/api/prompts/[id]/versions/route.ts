import { NextResponse } from "next/server";
import { getPromptById, listPromptVersions, rollbackPromptToVersion } from "@/lib/promptStore";
import { getRequestUser } from "@/lib/auth";
import { canWriteWorkspace } from "@/lib/workspaceStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function canEdit(req: Request, promptId: number): Promise<boolean> {
  const prompt = await getPromptById(promptId);
  if (!prompt) return false;

  const user = await getRequestUser(req);
  if (!user?.id) return prompt.user_id === null;

  if (prompt.workspace_id) {
    return canWriteWorkspace(prompt.workspace_id, user.id);
  }

  return prompt.user_id === null || Number(prompt.user_id) === Number(user.id);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const promptId = Number(id);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const allowed = await canEdit(req, promptId);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const versions = await listPromptVersions(promptId);
    return NextResponse.json({ promptId, versions });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List versions error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const promptId = Number(id);
    if (!Number.isInteger(promptId) || promptId <= 0) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const allowed = await canEdit(req, promptId);
    if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = (await req.json()) as Record<string, unknown>;
    const versionNo = typeof body.versionNo === "number" ? body.versionNo : Number(body.versionNo);
    if (!Number.isInteger(versionNo) || versionNo <= 0) {
      return NextResponse.json({ error: "versionNo must be positive integer" }, { status: 400 });
    }

    const user = await getRequestUser(req);
    const updated = await rollbackPromptToVersion(promptId, versionNo, user?.id ?? null);
    if (!updated) return NextResponse.json({ error: "version not found" }, { status: 404 });

    return NextResponse.json({ ok: true, prompt: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Rollback version error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
