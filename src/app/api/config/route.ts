// app/api/config/route.ts
import { NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cfg = await readConfig();
    return NextResponse.json(cfg);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Read error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    // Можно добавить простую проверку структуры, но writeConfig уже проверяет список
    await writeConfig(body);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Write error" }, { status: 400 });
  }
}
