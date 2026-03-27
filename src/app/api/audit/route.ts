import { NextResponse } from "next/server";
import { listAuditLogs } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "100");
    const items = await listAuditLogs(limit);
    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List audit logs error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
