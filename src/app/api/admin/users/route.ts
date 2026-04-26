import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSessionUserWithRole } from "@/lib/authz";
import { ensureDatabaseSchema, escapeSqlValue, runPostgresExec, runPostgresJsonQuery } from "@/lib/dbSchema";

function hashPassword(password: string, salt: string): string {
  const key = crypto.scryptSync(password, salt, 64);
  return key.toString("hex");
}

async function requireAdmin(req: Request): Promise<NextResponse | null> {
  const { user, isAdmin } = await getSessionUserWithRole(req);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  return null;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  await ensureDatabaseSchema();
  const rows = runPostgresJsonQuery<Record<string, unknown>[]>(`
    SELECT u.id, u.email, u.name, u.is_admin, u.must_change_password, u.created_at::text AS created_at,
           COUNT(p.id)::int AS prompt_count
    FROM users u
    LEFT JOIN prompts p ON p.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC, u.id DESC
  `);

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  await ensureDatabaseSchema();
  const body = (await req.json()) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const isAdmin = Boolean(body.isAdmin) || email === "admin" || name.toLowerCase() === "admin";

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "email и пароль (>=6) обязательны" }, { status: 400 });
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const n = name ? `'${escapeSqlValue(name)}'` : "NULL";

  const created = runPostgresJsonQuery<Record<string, unknown>[]>(`
    INSERT INTO users (email, password_hash, salt, name, is_admin, must_change_password)
    VALUES ('${escapeSqlValue(email)}', '${passwordHash}', '${salt}', ${n}, ${isAdmin ? "TRUE" : "FALSE"}, ${isAdmin ? "TRUE" : "FALSE"})
    RETURNING id, email, name, is_admin, must_change_password, created_at::text AS created_at
  `);

  return NextResponse.json(created[0], { status: 201 });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  await ensureDatabaseSchema();
  const body = (await req.json()) as Record<string, unknown>;
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const updates: string[] = [];
  if (typeof body.email === "string") updates.push(`email='${escapeSqlValue(body.email.trim().toLowerCase())}'`);
  if (typeof body.name === "string") updates.push(`name=${body.name.trim() ? `'${escapeSqlValue(body.name.trim())}'` : "NULL"}`);
  if (typeof body.isAdmin === "boolean") updates.push(`is_admin=${body.isAdmin ? "TRUE" : "FALSE"}`);
  if (typeof body.mustChangePassword === "boolean") updates.push(`must_change_password=${body.mustChangePassword ? "TRUE" : "FALSE"}`);

  if (typeof body.password === "string" && body.password.length >= 6) {
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(body.password, salt);
    updates.push(`password_hash='${passwordHash}'`);
    updates.push(`salt='${salt}'`);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
  }

  const updated = runPostgresJsonQuery<Record<string, unknown>[]>(`
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = ${id}
    RETURNING id, email, name, is_admin, must_change_password, created_at::text AS created_at
  `);

  return NextResponse.json(updated[0] ?? null);
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  await ensureDatabaseSchema();
  const userId = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  runPostgresExec(`DELETE FROM prompts WHERE user_id = ${userId};`);
  runPostgresExec(`DELETE FROM users WHERE id = ${userId};`);

  return NextResponse.json({ ok: true });
}
