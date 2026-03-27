// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/userStore";

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  return `pb_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; ${secure}`;
}

export async function POST(req: Request) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/pb_session=([A-Fa-f0-9]+);?/);
    const token = match ? match[1] : null;
    if (token) {
      try {
        await deleteSession(token);
      } catch {
        // ignore
      }
    }
    const res = NextResponse.json({ ok: true });
    res.headers.append("Set-Cookie", clearSessionCookie());
    return res;
  } catch {
    console.error("Logout failed");
    return NextResponse.json({ error: "Система временно недоступна" }, { status: 503 });
  }
}
