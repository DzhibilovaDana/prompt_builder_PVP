// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getUserBySession } from "@/lib/userStore";

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const m = cookie.match(/pb_session=([A-Fa-f0-9]+);?/);
    const token = m ? m[1] : null;
    if (!token) {
      return NextResponse.json({ user: null });
    }
    const user = await getUserBySession(token);
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch {
    console.error("Session check failed");
    return NextResponse.json({ error: "Система временно недоступна" }, { status: 503 });
  }
}
