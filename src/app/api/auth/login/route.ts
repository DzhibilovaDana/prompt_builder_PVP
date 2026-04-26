import { NextResponse } from "next/server";
import { verifyUser, createSession, ensureDefaultAdminUser } from "@/lib/userStore";

function makeSessionCookie(token: string) {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const secure = process.env.SESSION_COOKIE_SECURE === "true" ? "Secure; " : "";
  return `pb_session=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax; ${secure}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json({ error: "password required" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    if (email === "admin") {
      await ensureDefaultAdminUser();
    }

    const user = await verifyUser(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.is_admin, mustChangePassword: user.must_change_password } });
    res.headers.append("Set-Cookie", makeSessionCookie(token));
    return res;
  } catch (e: unknown) {
    console.error("Login failed", e);
    return NextResponse.json({ error: "Система временно недоступна" }, { status: 503 });
  }
}
