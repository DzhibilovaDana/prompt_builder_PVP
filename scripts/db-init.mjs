import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "db.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

execFileSync("sqlite3", [
  dbFile,
  `
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,
]);

console.log(`SQLite initialized at ${dbFile}`);
