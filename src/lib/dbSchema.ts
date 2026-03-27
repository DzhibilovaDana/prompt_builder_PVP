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

function readSqliteColumns(table: string): string[] {
  const raw = execFileSync("sqlite3", ["-json", DB_PATH, `PRAGMA table_info(${table});`], {
    encoding: "utf-8",
  }).trim();

  if (!raw) return [];

  type Col = { name: string };
  const cols = JSON.parse(raw) as Col[];
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
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
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
      changed_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      change_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (prompt_id, version_no)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      meta_json TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prompt_runs (
      id SERIAL PRIMARY KEY,
      prompt_id INTEGER NULL REFERENCES prompts(id) ON DELETE SET NULL,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      provider TEXT NOT NULL,
      model TEXT,
      status TEXT NOT NULL,
      latency_ms INTEGER,
      output_text TEXT,
      error_text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prompt_scores (
      id SERIAL PRIMARY KEY,
      prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
      run_id INTEGER NULL REFERENCES prompt_runs(id) ON DELETE SET NULL,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
      criteria TEXT,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ab_tests (
      id SERIAL PRIMARY KEY,
      workspace_id INTEGER NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      goal TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
      created_by_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ab_variants (
      id SERIAL PRIMARY KEY,
      test_id INTEGER NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
      prompt_id INTEGER NULL REFERENCES prompts(id) ON DELETE SET NULL,
      variant_key TEXT NOT NULL,
      traffic_percent INTEGER NOT NULL CHECK (traffic_percent >= 0 AND traffic_percent <= 100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (test_id, variant_key)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_prompts_user_created ON prompts(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompts_workspace_created ON prompts(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_version ON prompt_versions(prompt_id, version_no DESC);
    CREATE INDEX IF NOT EXISTS idx_prompt_runs_prompt_created ON prompt_runs(prompt_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompt_scores_prompt_created ON prompt_scores(prompt_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

    INSERT INTO workspace_members (workspace_id, user_id, role)
    SELECT w.id, w.owner_user_id, 'owner'
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = w.owner_user_id
    WHERE wm.workspace_id IS NULL;
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
      owner_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
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

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      version_no INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      changed_by_user_id INTEGER NULL,
      change_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (prompt_id, version_no),
      FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
      FOREIGN KEY(changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_user_id INTEGER NULL,
      meta_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NULL,
      user_id INTEGER NULL,
      provider TEXT NOT NULL,
      model TEXT,
      status TEXT NOT NULL,
      latency_ms INTEGER,
      output_text TEXT,
      error_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE SET NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      run_id INTEGER NULL,
      user_id INTEGER NULL,
      score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
      criteria TEXT,
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
      goal TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
      created_by_user_id INTEGER NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ab_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      prompt_id INTEGER NULL,
      variant_key TEXT NOT NULL,
      traffic_percent INTEGER NOT NULL CHECK (traffic_percent >= 0 AND traffic_percent <= 100),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (test_id, variant_key),
      FOREIGN KEY(test_id) REFERENCES ab_tests(id) ON DELETE CASCADE,
      FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_prompts_user_created ON prompts(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompts_workspace_created ON prompts(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_version ON prompt_versions(prompt_id, version_no DESC);
    CREATE INDEX IF NOT EXISTS idx_prompt_runs_prompt_created ON prompt_runs(prompt_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prompt_scores_prompt_created ON prompt_scores(prompt_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
  `;

  execFileSync("sqlite3", [DB_PATH, createSQL]);

  const promptColumns = readSqliteColumns("prompts");
  if (!promptColumns.includes("user_id")) {
    execFileSync("sqlite3", [DB_PATH, "ALTER TABLE prompts ADD COLUMN user_id INTEGER NULL;"]);
  }
  if (!promptColumns.includes("workspace_id")) {
    execFileSync("sqlite3", [DB_PATH, "ALTER TABLE prompts ADD COLUMN workspace_id INTEGER NULL;"]);
  }
  if (!promptColumns.includes("updated_at")) {
    execFileSync("sqlite3", [DB_PATH, "ALTER TABLE prompts ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));"]);
  }

  execFileSync(
    "sqlite3",
    [
      DB_PATH,
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       SELECT w.id, w.owner_user_id, 'owner'
       FROM workspaces w
       LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = w.owner_user_id
       WHERE wm.workspace_id IS NULL;`,
    ],
    { encoding: "utf-8" }
  );
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

export { DATA_DIR, DB_PATH };
