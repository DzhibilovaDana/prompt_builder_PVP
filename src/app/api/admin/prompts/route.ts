import { NextResponse } from "next/server";
import { getSessionUserWithRole } from "@/lib/authz";
import { ensureDatabaseSchema, runPostgresJsonQuery } from "@/lib/dbSchema";

export async function GET(req: Request) {
  const { user, isAdmin } = await getSessionUserWithRole(req);
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });

  await ensureDatabaseSchema();
  const rows = runPostgresJsonQuery<Record<string, unknown>[]>(`
    SELECT p.id, p.title, p.created_at::text AS created_at, p.user_id, u.email AS user_email, u.name AS user_name
    FROM prompts p
    LEFT JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 200
  `);

  return NextResponse.json(rows);
}
