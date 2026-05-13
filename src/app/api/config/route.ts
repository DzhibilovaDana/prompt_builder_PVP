import { NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/config";
import { getRequestUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cfg = await readConfig();
    return NextResponse.json(cfg);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Read error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!user.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body = await req.json();
    await writeConfig(body);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Write error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
