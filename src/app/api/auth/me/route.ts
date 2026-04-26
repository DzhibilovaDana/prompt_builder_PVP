import { NextResponse } from "next/server";
import { getSessionUserWithRole } from "@/lib/authz";

export async function GET(req: Request) {
  try {
    const { user, role, isAdmin, mustChangePassword } = await getSessionUserWithRole(req);
    return NextResponse.json({ user, role, isAdmin, mustChangePassword });
  } catch (e: unknown) {
    console.error("Session check failed", e);
    return NextResponse.json({ error: "Система временно недоступна" }, { status: 503 });
  }
}
