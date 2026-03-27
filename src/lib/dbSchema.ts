import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.sqlite");

type DbEngine = "postgres" | "sqlite";

function getDbEngine(): DbEngine {
  const url = process.env.DATABASE_URL?.trim();
  if (url?.startsWith("postgresql://") || url?.startsWith("postgres://")) {
    return "postgres";
  }
  return "sqlite";
}

function getPostgresUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for PostgreSQL mode");
  }
  return url;
}

function runSqliteRaw(sql: string): string {
  return execFileSync("sqlite3", ["-json", DB_PATH, sql], {
    encoding: "utf-8",
  }).trim();
}

function runSqliteJson<T>(sql: string): T {
  const raw = runSqliteRaw(sql);
  return raw ? (JSON.parse(raw) as T) : ([] as T);
}

function sqliteTableExists(table: string): boolean {
  type Row = { name: string };
  const rows = runSqliteJson<Row[]>(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table.replace(/'/g, "''")}' LIMIT 1;`);
  return Boolean(rows[0]?.name);
}

function readPromptColumns(): string[] {
  type Col = { name: string };
  const cols = runSqliteJson<Col[]>("PRAGMA table_info(prompts);");
  return cols.map((c) => c.name);
}

function readColumnNames(table: string): string[] {
  type Col = { name: string };
  if (!sqliteTableExists(table)) return [];
  const cols = runSqliteJson<Col[]>(`PRAGMA table_info(${table});`);
  return cols.map((c) => c.name);
}

async function ensurePostgresSchema(): Promise<void> {
  const databaseUrl = getPostgresUrl();
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      workspace_id INTEGER NULL REFERENCES workspaces(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id SERIAL PRIMARY KEY,
      prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      version_no INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(prompt_id, version_no)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NULL,
      action TEXT NOT NULL,
      actor_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      workspace_id INTEGER NULL REFERENCES workspaces(id) ON DELETE SET NULL,
      metadata_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prompt_runs (
      id SERIAL PRIMARY KEY,
      prompt_id INTEGER NULL REFERENCES prompts(id) ON DELETE SET NULL,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      workspace_id INTEGER NULL REFERENCES workspaces(id) ON DELETE SET NULL,
      provider TEXT NOT NULL,
      model TEXT,
      status TEXT NOT NULL,
      latency_ms INTEGER,
      prompt_chars INTEGER NOT NULL DEFAULT 0,
      output_chars INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prompt_scores (
      id SERIAL PRIMARY KEY,
      prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      run_id INTEGER NULL REFERENCES prompt_runs(id) ON DELETE SET NULL,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      score INTEGER NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT prompt_scores_score_check CHECK (score >= 1 AND score <= 5)
    );

    CREATE TABLE IF NOT EXISTS ab_tests (
      id SERIAL PRIMARY KEY,
      workspace_id INTEGER NULL REFERENCES workspaces(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      prompt_id INTEGER NULL REFERENCES prompts(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ab_test_variants (
      id SERIAL PRIMARY KEY,
      test_id INTEGER NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE prompts ADD COLUMN IF NOT EXISTS workspace_id INTEGER NULL REFERENCES workspaces(id) ON DELETE SET NULL;
    ALTER TABLE prompts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS idx_prompts_user_created ON prompts(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompts_workspace_created ON prompts(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_versions(prompt_id, version_no DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompt_runs_prompt ON prompt_runs(prompt_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompt_scores_prompt ON prompt_scores(prompt_id, created_at DESC);
  `;

  execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf-8",
    stdio: "pipe",
  });
}

function ensureSqliteSchema(): void {
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

    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_user_id INTEGER NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (workspace_id, user_id),
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NULL,
      workspace_id INTEGER NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      version_no INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_user_id INTEGER NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
      FOREIGN KEY(author_user_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(prompt_id, version_no)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NULL,
      action TEXT NOT NULL,
      actor_user_id INTEGER NULL,
      workspace_id INTEGER NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NULL,
      user_id INTEGER NULL,
      workspace_id INTEGER NULL,
      provider TEXT NOT NULL,
      model TEXT,
      status TEXT NOT NULL,
      latency_ms INTEGER,
      prompt_chars INTEGER NOT NULL DEFAULT 0,
      output_chars INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE SET NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      run_id INTEGER NULL,
      user_id INTEGER NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
      FOREIGN KEY(run_id) REFERENCES prompt_runs(id) ON DELETE SET NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NULL,
      name TEXT NOT NULL,
      prompt_id INTEGER NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by INTEGER NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
      FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ab_test_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(test_id) REFERENCES ab_tests(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_prompts_user_created ON prompts(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompts_workspace_created ON prompts(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_versions(prompt_id, version_no DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompt_runs_prompt ON prompt_runs(prompt_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompt_scores_prompt ON prompt_scores(prompt_id, created_at DESC);
  `;

  execFileSync("sqlite3", [DB_PATH, createSQL]);

  const promptColumns = readPromptColumns();
  if (!promptColumns.includes("user_id")) {
    execFileSync("sqlite3", [DB_PATH, "ALTER TABLE prompts ADD COLUMN user_id INTEGER NULL;"]);
  }
  if (!promptColumns.includes("workspace_id")) {
    execFileSync("sqlite3", [DB_PATH, "ALTER TABLE prompts ADD COLUMN workspace_id INTEGER NULL;"]);
  }
  if (!promptColumns.includes("updated_at")) {
    execFileSync("sqlite3", [DB_PATH, "ALTER TABLE prompts ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));"]);
  }

  const memberCols = readColumnNames("workspace_members");
  if (memberCols.length > 0 && !memberCols.includes("role")) {
    execFileSync("sqlite3", [DB_PATH, "ALTER TABLE workspace_members ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer';"]);
  }
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (getDbEngine() === "postgres") {
    await ensurePostgresSchema();
    return;
  }
  ensureSqliteSchema();
}

export function getDatabaseEngine(): DbEngine {
  return getDbEngine();
}

export function runPostgresJsonQuery<T>(sql: string): T {
  const databaseUrl = getPostgresUrl();
  const wrapped = `SELECT COALESCE(json_agg(t), '[]'::json) FROM (${sql}) AS t;`;
  const output = execFileSync("psql", [databaseUrl, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", wrapped], {
    encoding: "utf-8",
  }).trim();

  if (!output) {
    return [] as T;
  }

  return JSON.parse(output) as T;
}

export function runPostgresExec(sql: string): void {
  const databaseUrl = getPostgresUrl();
  execFileSync("psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf-8",
    stdio: "pipe",
  });
}

export function escapeSqlValue(value: string): string {
  return value.replace(/'/g, "''");
}

export { DATA_DIR, DB_PATH };
