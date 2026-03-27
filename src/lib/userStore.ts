// src/lib/userStore.ts
import crypto from "crypto";
import { ensureDatabaseSchema } from "@/lib/dbSchema";
import { escapeSql, nowExpression, runExec, runJsonQuery } from "@/lib/sql";

function hashPassword(password: string, salt: string): string {
  const key = crypto.scryptSync(password, salt, 64);
  return key.toString("hex");
}

type SessionUserRow = {
  id: number;
  email: string;
  name?: string | null;
  password_hash: string;
  salt: string;
  created_at: string;
};

export type UserRecord = {
  id: number;
  email: string;
  name?: string | null;
  password_hash: string;
  salt: string;
  created_at: string;
};

function normalizeUserRow(row: Record<string, unknown>): UserRecord {
  return {
    id: Number(row.id),
    email: String(row.email ?? ""),
    name: row.name == null ? null : String(row.name),
    password_hash: String(row.password_hash ?? ""),
    salt: String(row.salt ?? ""),
    created_at: String(row.created_at ?? ""),
  };
}

async function ensurePersonalWorkspace(userId: number, userName?: string | null): Promise<void> {
  const name = userName?.trim() ? `${userName.trim()} Workspace` : `User ${userId} Workspace`;

  const existing = runJsonQuery<Array<{ id: number }>>(
    `SELECT id FROM workspaces WHERE owner_user_id = ${userId} ORDER BY id ASC LIMIT 1;`
  );

  if (existing[0]?.id) {
    const workspaceId = Number(existing[0].id);
    runExec(`INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
      VALUES (${workspaceId}, ${userId}, 'owner', ${nowExpression()})
      ON CONFLICT (workspace_id, user_id) DO NOTHING;`);
    return;
  }

  const rows = runJsonQuery<Array<{ id: number }>>(
    `INSERT INTO workspaces (name, owner_user_id, created_at, updated_at)
      VALUES ('${escapeSql(name)}', ${userId}, ${nowExpression()}, ${nowExpression()})
      RETURNING id;`
  );

  const workspaceId = Number(rows[0]?.id ?? 0);
  if (workspaceId > 0) {
    runExec(`INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
      VALUES (${workspaceId}, ${userId}, 'owner', ${nowExpression()})
      ON CONFLICT (workspace_id, user_id) DO NOTHING;`);
  }
}

export async function createUser(email: string, password: string, name?: string | null): Promise<UserRecord> {
  await ensureDatabaseSchema();

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name ? String(name) : null;
  const salt = crypto.randomBytes(16).toString("hex");
  const password_hash = hashPassword(password, salt);

  const e = escapeSql(normalizedEmail);
  const n = normalizedName ? `'${escapeSql(normalizedName)}'` : "NULL";

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `INSERT INTO users (email, password_hash, salt, name, created_at)
      VALUES ('${e}', '${password_hash}', '${salt}', ${n}, ${nowExpression()})
      RETURNING id, email, name, password_hash, salt, created_at`
  );

  const created = rows[0];
  if (!created) throw new Error("Failed to create user");
  const user = normalizeUserRow(created);
  await ensurePersonalWorkspace(user.id, user.name);
  return user;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT id, email, name, password_hash, salt, created_at
      FROM users
      WHERE email = '${escapeSql(email.trim().toLowerCase())}'
      LIMIT 1`
  );
  return rows[0] ? normalizeUserRow(rows[0]) : null;
}

export async function getUserById(id: number): Promise<UserRecord | null> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT id, email, name, password_hash, salt, created_at
      FROM users
      WHERE id = ${id}
      LIMIT 1`
  );
  return rows[0] ? normalizeUserRow(rows[0]) : null;
}

export async function verifyUser(email: string, password: string): Promise<UserRecord | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  const hashed = hashPassword(password, user.salt);
  if (crypto.timingSafeEqual(Buffer.from(hashed, "hex"), Buffer.from(user.password_hash, "hex"))) {
    return user;
  }
  return null;
}

export async function createSession(userId: number): Promise<string> {
  await ensureDatabaseSchema();
  const token = crypto.randomBytes(32).toString("hex");

  runExec(`INSERT INTO sessions (token, user_id, created_at) VALUES ('${escapeSql(token)}', ${userId}, ${nowExpression()});`);
  return token;
}

export async function getUserBySession(token: string): Promise<UserRecord | null> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<SessionUserRow[]>(
    `SELECT u.id, u.email, u.name, u.password_hash, u.salt, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = '${escapeSql(token)}'
      LIMIT 1`
  );

  const r = rows[0];
  if (!r) return null;

  return {
    id: Number(r.id),
    email: String(r.email),
    name: r.name == null ? null : String(r.name),
    password_hash: String(r.password_hash),
    salt: String(r.salt),
    created_at: String(r.created_at),
  };
}

export async function deleteSession(token: string): Promise<boolean> {
  await ensureDatabaseSchema();
  runExec(`DELETE FROM sessions WHERE token = '${escapeSql(token)}';`);
  return true;
}
