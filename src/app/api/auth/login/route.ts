// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { verifyUser, createSession } from "@/lib/userStore";

function makeSessionCookie(token: string) {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  return `pb_session=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax; ${secure}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }

    const user = await verifyUser(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
    res.headers.append("Set-Cookie", makeSessionCookie(token));
    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Login error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
