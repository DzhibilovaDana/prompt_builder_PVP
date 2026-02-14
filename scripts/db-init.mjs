import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "db.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
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

execFileSync("sqlite3", [dbFile, createSQL]);

const colsRaw = execFileSync("sqlite3", ["-json", dbFile, "PRAGMA table_info(prompts);"], {
  encoding: "utf-8",
}).trim();
const cols = colsRaw ? JSON.parse(colsRaw) : [];
const hasUserId = cols.some((col) => col?.name === "user_id");

if (!hasUserId) {
  execFileSync("sqlite3", [dbFile, "ALTER TABLE prompts ADD COLUMN user_id INTEGER NULL;"]);
}

console.log(`SQLite initialized at ${dbFile}`);
