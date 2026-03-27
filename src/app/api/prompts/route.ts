import { NextResponse } from "next/server";
import { createPrompt, listPrompts, type PromptRecord } from "@/lib/promptStore";
import { getRequestUser } from "@/lib/auth";
import { ensurePersonalWorkspace } from "@/lib/workspaceStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPublic(item: PromptRecord) {
  return {
    id: item.id,
    workspaceId: item.workspace_id,
    title: item.title,
    prompt: item.content,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function GET(req: Request) {
  try {
    const user = await getRequestUser(req);
    const workspaceIdRaw = new URL(req.url).searchParams.get("workspaceId");
    const workspaceId = workspaceIdRaw ? Number(workspaceIdRaw) : null;

    const prompts = await listPrompts(
      user?.id ?? undefined,
      workspaceId && Number.isInteger(workspaceId) && workspaceId > 0 ? workspaceId : undefined,
    );
    const mapped = Array.isArray(prompts) ? prompts.map(toPublic) : [];
    return NextResponse.json(mapped);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List prompts error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : typeof body.prompt === "string"
          ? body.prompt.trim()
          : "";

    if (!title || !content) {
      return NextResponse.json({ error: "title and prompt (or content) are required" }, { status: 400 });
    }

    const user = await getRequestUser(req);
    let workspaceId = typeof body.workspaceId === "number" && Number.isInteger(body.workspaceId) ? body.workspaceId : null;

    if (user?.id && !workspaceId) {
      const workspace = await ensurePersonalWorkspace(user.id, user.name);
      workspaceId = workspace.id;
    }

    const created = await createPrompt(title, content, user?.id ?? null, workspaceId ?? null);
    return NextResponse.json(toPublic(created), { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create prompt error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
