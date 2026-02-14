import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

function readPromptColumns(): string[] {
  const raw = execFileSync("sqlite3", ["-json", DB_PATH, "PRAGMA table_info(prompts);"], {
    encoding: "utf-8",
  }).trim();
  if (!raw) return [];

  type Col = { name: string };
  const cols = JSON.parse(raw) as Col[];
  return cols.map((c) => c.name);
}

export function ensureDatabaseSchema(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const createSQL = `
    PRAGMA foreign_keys = ON;

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

  execFileSync("sqlite3", [DB_PATH, createSQL]);

  // Backward compatibility for old DB created by previous db:init script.
  const promptColumns = readPromptColumns();
  if (!promptColumns.includes("user_id")) {
    execFileSync("sqlite3", [DB_PATH, "ALTER TABLE prompts ADD COLUMN user_id INTEGER NULL;"]);
  }
}

export { DATA_DIR, DB_PATH };
