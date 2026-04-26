// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getSessionUserWithRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const { user, role } = await getSessionUserWithRole(req);
    return NextResponse.json({ user, role });
  } catch (e: unknown) {
    console.error("Session check failed", e);
    return NextResponse.json({ error: "Система временно недоступна" }, { status: 503 });
  }
}
