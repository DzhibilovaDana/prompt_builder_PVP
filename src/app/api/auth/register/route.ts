// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { createUser, createSession, getUserByEmail } from "@/lib/userStore";

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
    const name = typeof body.name === "string" ? body.name.trim() : null;

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "email and password (>=6) required" }, { status: 400 });
    }

    // check exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const created = await createUser(email, password, name);
    const token = await createSession(created.id);

    const res = NextResponse.json({ ok: true, user: { id: created.id, email: created.email, name: created.name } }, { status: 201 });
    res.headers.append("Set-Cookie", makeSessionCookie(token));
    return res;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Register error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
