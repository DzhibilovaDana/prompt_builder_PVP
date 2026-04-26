import crypto from "crypto";
import { execFileSync } from "child_process";
import { DB_PATH, ensureDatabaseSchema, escapeSqlValue, getDatabaseEngine, runPostgresExec, runPostgresJsonQuery } from "@/lib/dbSchema";
import { ensurePersonalWorkspace } from "@/lib/workspaceStore";

function runSqlite<T>(sql: string): T {
  const output = execFileSync("sqlite3", ["-json", DB_PATH, sql], {
    encoding: "utf-8",
  }).trim();

  if (!output) {
    return [] as T;
  }

  return JSON.parse(output) as T;
}

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
  is_admin?: boolean;
  must_change_password?: boolean;
  created_at: string;
};

export type UserRecord = {
  id: number;
  email: string;
  name?: string | null;
  password_hash: string;
  salt: string;
  is_admin: boolean;
  must_change_password: boolean;
  created_at: string;
};

function normalizeUserRow(row: Record<string, unknown>): UserRecord {
  return {
    id: Number(row.id),
    email: String(row.email ?? ""),
    name: row.name == null ? null : String(row.name),
    password_hash: String(row.password_hash ?? ""),
    salt: String(row.salt ?? ""),
    is_admin: Boolean(row.is_admin),
    must_change_password: Boolean(row.must_change_password),
    created_at: String(row.created_at ?? ""),
  };
}

export async function createUser(email: string, password: string, name?: string | null): Promise<UserRecord> {
  await ensureDatabaseSchema();

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name ? String(name).trim() : null;
  const isAdminCandidate = normalizedEmail === "admin" || normalizedName?.toLowerCase() === "admin";
  const salt = crypto.randomBytes(16).toString("hex");
  const password_hash = hashPassword(password, salt);

  if (getDatabaseEngine() === "postgres") {
    const e = escapeSqlValue(normalizedEmail);
    const n = normalizedName ? `'${escapeSqlValue(normalizedName)}'` : "NULL";
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(
      `INSERT INTO users (email, password_hash, salt, name, is_admin, must_change_password)
       VALUES ('${e}', '${password_hash}', '${salt}', ${n}, ${isAdminCandidate ? "TRUE" : "FALSE"}, ${isAdminCandidate ? "TRUE" : "FALSE"})
       RETURNING id, email, name, password_hash, salt, is_admin, must_change_password, created_at::text AS created_at`
    );
    const created = rows[0];
    if (!created) throw new Error("Failed to create user");
    const user = normalizeUserRow(created);
    await ensurePersonalWorkspace(user.id, user.name);
    return user;
  }

  const emailEsc = escapeSqlValue(normalizedEmail);
  const nm = normalizedName ? escapeSqlValue(normalizedName) : "";

  runSqlite<unknown>(
    `INSERT INTO users (email, password_hash, salt, name, created_at) VALUES ('${emailEsc}', '${password_hash}', '${salt}', ${nm ? `'${nm}'` : "NULL"}, datetime('now'));`
  );

  const rows = runSqlite<UserRecord[]>("SELECT id, email, name, password_hash, salt, is_admin, must_change_password, created_at FROM users ORDER BY id DESC LIMIT 1;");
  const created = rows[0];
  if (!created) throw new Error("Failed to create user");
  await ensurePersonalWorkspace(created.id, created.name);
  return created;
}

export async function ensureDefaultAdminUser(): Promise<UserRecord> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    const existingRows = runPostgresJsonQuery<Record<string, unknown>[]>(`
      SELECT id, email, name, password_hash, salt, is_admin, must_change_password, created_at::text AS created_at
      FROM users
      WHERE is_admin = TRUE
      ORDER BY id ASC
      LIMIT 1
    `);

    const existing = existingRows[0];
    if (existing) return normalizeUserRow(existing);

    const salt = crypto.randomBytes(16).toString("hex");
    const password_hash = hashPassword("admin", salt);
    const createdRows = runPostgresJsonQuery<Record<string, unknown>[]>(`
      INSERT INTO users (email, password_hash, salt, name, is_admin, must_change_password)
      VALUES ('admin', '${password_hash}', '${salt}', 'Administrator', TRUE, TRUE)
      RETURNING id, email, name, password_hash, salt, is_admin, must_change_password, created_at::text AS created_at
    `);

    const created = createdRows[0];
    if (!created) throw new Error("Failed to bootstrap admin user");
    return normalizeUserRow(created);
  }

  throw new Error("Unsupported database engine");
}

export async function updateUserPassword(userId: number, newPassword: string): Promise<void> {
  await ensureDatabaseSchema();
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(newPassword, salt);

  if (getDatabaseEngine() === "postgres") {
    runPostgresExec(`
      UPDATE users
      SET password_hash = '${passwordHash}', salt = '${salt}', must_change_password = FALSE
      WHERE id = ${userId}
    `);
    return;
  }

  throw new Error("Unsupported database engine");
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(
      `SELECT id, email, name, password_hash, salt, is_admin, must_change_password, created_at::text AS created_at
       FROM users
       WHERE email = '${escapeSqlValue(email.trim().toLowerCase())}'
       LIMIT 1`
    );
    return rows[0] ? normalizeUserRow(rows[0]) : null;
  }

  const e = escapeSqlValue(String(email).trim().toLowerCase());
  const rows = runSqlite<UserRecord[]>(`SELECT id, email, name, password_hash, salt, is_admin, must_change_password, created_at FROM users WHERE email = '${e}' LIMIT 1;`);
  return rows[0] ?? null;
}

export async function getUserById(id: number): Promise<UserRecord | null> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(
      `SELECT id, email, name, password_hash, salt, is_admin, must_change_password, created_at::text AS created_at
       FROM users
       WHERE id = ${id}
       LIMIT 1`
    );
    return rows[0] ? normalizeUserRow(rows[0]) : null;
  }

  const rows = runSqlite<UserRecord[]>(`SELECT id, email, name, password_hash, salt, is_admin, must_change_password, created_at FROM users WHERE id = ${id} LIMIT 1;`);
  return rows[0] ?? null;
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

  if (getDatabaseEngine() === "postgres") {
    runPostgresExec(`INSERT INTO sessions (token, user_id) VALUES ('${escapeSqlValue(token)}', ${userId});`);
    return token;
  }

  runSqlite<unknown>(`INSERT INTO sessions (token, user_id, created_at) VALUES ('${escapeSqlValue(token)}', ${userId}, datetime('now'));`);
  return token;
}

export async function getUserBySession(token: string): Promise<UserRecord | null> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(
      `SELECT u.id, u.email, u.name, u.password_hash, u.salt, u.is_admin, u.must_change_password, u.created_at::text AS created_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = '${escapeSqlValue(token)}'
       LIMIT 1`
    );
    return rows[0] ? normalizeUserRow(rows[0]) : null;
  }

  const rows = runSqlite<SessionUserRow[]>(`SELECT u.id, u.email, u.name, u.password_hash, u.salt, u.is_admin, u.must_change_password, u.created_at
    FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = '${escapeSqlValue(token)}' LIMIT 1;`);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    password_hash: r.password_hash,
    salt: r.salt,
    is_admin: Boolean(r.is_admin),
    must_change_password: Boolean(r.must_change_password),
    created_at: r.created_at,
  };
}

export async function deleteSession(token: string): Promise<boolean> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    runPostgresExec(`DELETE FROM sessions WHERE token = '${escapeSqlValue(token)}';`);
    return true;
  }

  runSqlite<unknown>(`DELETE FROM sessions WHERE token = '${escapeSqlValue(token)}';`);
  return true;
}
