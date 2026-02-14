// src/lib/userStore.ts
import crypto from "crypto";
import { execFileSync } from "child_process";
import { DB_PATH, ensureDatabaseSchema } from "@/lib/dbSchema";

function ensureDbFile(): void {
  ensureDatabaseSchema();
}

function runSql<T>(sql: string, args: string[] = []): T {
  ensureDbFile();
  const output = execFileSync("sqlite3", ["-json", DB_PATH, sql, ...args], {
    encoding: "utf-8",
  }).trim();

  if (!output) {
    return [] as T;
  }

  return JSON.parse(output) as T;
}

function escape(value: string): string {
  return value.replace(/'/g, "''");
}

function hashPassword(password: string, salt: string): string {
  // scryptSync returns a Buffer; derive 64 bytes
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

export async function createUser(email: string, password: string, name?: string | null): Promise<UserRecord> {
  const emailEsc = escape(email.trim().toLowerCase());
  const nm = name ? escape(String(name)) : "";

  // generate salt
  const salt = crypto.randomBytes(16).toString("hex");
  const password_hash = hashPassword(password, salt);

  runSql<unknown>(
    `INSERT INTO users (email, password_hash, salt, name, created_at) VALUES ('${emailEsc}', '${password_hash}', '${salt}', ${nm ? `'${nm}'` : "NULL"}, datetime('now'));`
  );

  const rows = runSql<UserRecord[]>("SELECT id, email, name, password_hash, salt, created_at FROM users ORDER BY id DESC LIMIT 1;");
  const created = rows[0];
  if (!created) throw new Error("Failed to create user");
  return created;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const e = escape(String(email).trim().toLowerCase());
  const rows = runSql<UserRecord[]>(`SELECT id, email, name, password_hash, salt, created_at FROM users WHERE email = '${e}' LIMIT 1;`);
  return rows[0] ?? null;
}

export async function getUserById(id: number): Promise<UserRecord | null> {
  const rows = runSql<UserRecord[]>(`SELECT id, email, name, password_hash, salt, created_at FROM users WHERE id = ${id} LIMIT 1;`);
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

// sessions
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const t = escape(token);
  runSql<unknown>(`INSERT INTO sessions (token, user_id, created_at) VALUES ('${t}', ${userId}, datetime('now'));`);
  return token;
}

export async function getUserBySession(token: string): Promise<UserRecord | null> {
  const t = escape(token);
  const rows = runSql<SessionUserRow[]>(`SELECT u.id, u.email, u.name, u.password_hash, u.salt, u.created_at
    FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = '${t}' LIMIT 1;`);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    password_hash: r.password_hash,
    salt: r.salt,
    created_at: r.created_at,
  };
}

export async function deleteSession(token: string): Promise<boolean> {
  const t = escape(token);
  runSql<unknown>(`DELETE FROM sessions WHERE token = '${t}';`);
  return true;
}
