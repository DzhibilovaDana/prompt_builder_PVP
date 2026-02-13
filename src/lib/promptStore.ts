// src/lib/promptStore.ts
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

export type PromptRecord = {
  id: number;
  user_id: number | null;
  title: string;
  content: string;
  created_at: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

function ensureDbFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Create tables if not exists: users, prompts (with user_id), sessions
  // Using sqlite3 CLI for simplicity (existing approach)
  const createSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  // Note: we pass the SQL to sqlite3 CLI; it will create file if missing
  execFileSync("sqlite3", [DB_PATH, createSQL]);
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

/**
 * listPrompts
 * If userId provided -> return prompts for this user (their favorites on server)
 * If no userId -> return empty array (we treat server-side favorites as per-user)
 */
export async function listPrompts(userId?: number | null): Promise<PromptRecord[]> {
  if (typeof userId === "number" && Number.isInteger(userId) && userId > 0) {
    const rows = runSql<PromptRecord[]>(
      `SELECT id, user_id, title, content, created_at FROM prompts WHERE user_id = ${userId} ORDER BY datetime(created_at) DESC, id DESC;`
    );
    return rows;
  }
  // anonymous -> no server-side prompts
  return [];
}

export async function getPromptById(id: number): Promise<PromptRecord | null> {
  const rows = runSql<PromptRecord[]>(
    `SELECT id, user_id, title, content, created_at FROM prompts WHERE id = ${id} LIMIT 1;`
  );
  return rows[0] ?? null;
}

export async function createPrompt(title: string, content: string, userId?: number | null): Promise<PromptRecord> {
  const t = escape(title);
  const c = escape(content);
  const uid = typeof userId === "number" && Number.isInteger(userId) ? `${userId}` : "NULL";

  runSql<unknown>(
    `INSERT INTO prompts (user_id, title, content, created_at) VALUES (${uid}, '${t}', '${c}', datetime('now'));`
  );

  const rows = runSql<PromptRecord[]>(
    "SELECT id, user_id, title, content, created_at FROM prompts ORDER BY id DESC LIMIT 1;"
  );

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create prompt");
  }
  return created;
}

export async function deletePrompt(id: number): Promise<boolean> {
  const existing = await getPromptById(id);
  if (!existing) return false;

  runSql<unknown>(`DELETE FROM prompts WHERE id = ${id};`);
  return true;
}
