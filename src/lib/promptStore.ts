import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

export type PromptRecord = {
  id: number;
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

  execFileSync("sqlite3", [DB_PATH, `
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `]);
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

export async function listPrompts(): Promise<PromptRecord[]> {
  const rows = runSql<PromptRecord[]>(
    "SELECT id, title, content, created_at FROM prompts ORDER BY datetime(created_at) DESC, id DESC;"
  );
  return rows;
}

export async function getPromptById(id: number): Promise<PromptRecord | null> {
  const rows = runSql<PromptRecord[]>(
    `SELECT id, title, content, created_at FROM prompts WHERE id = ${id} LIMIT 1;`
  );
  return rows[0] ?? null;
}

export async function createPrompt(title: string, content: string): Promise<PromptRecord> {
  const t = escape(title);
  const c = escape(content);

  runSql<unknown>(
    `INSERT INTO prompts (title, content, created_at) VALUES ('${t}', '${c}', datetime('now'));`
  );

  const rows = runSql<PromptRecord[]>(
    "SELECT id, title, content, created_at FROM prompts ORDER BY id DESC LIMIT 1;"
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
