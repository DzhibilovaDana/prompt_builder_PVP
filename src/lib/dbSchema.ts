import { execFileSync } from "child_process";

export type DbEngine = "postgres";

let schemaReady = false;
let schemaInitPromise: Promise<void> | null = null;

function getPostgresUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || (!url.startsWith("postgresql://") && !url.startsWith("postgres://"))) {
    throw new Error("DATABASE_URL must point to PostgreSQL");
  }
  return url;
}

function normalizeSql(sql: string): string {
  return sql.trim().replace(/;\s*$/, "");
}

function runPsql(args: string[], errorMessage: string): string {
  try {
    return execFileSync("psql", args, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 2500,
      env: { ...process.env, PGCONNECT_TIMEOUT: "2" },
    }).trim();
  } catch (error: unknown) {
    const detail =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr?: string }).stderr || "")
            .split("\n")
            .find((line) => line.trim().length > 0) || "unknown psql error"
        : "unknown psql error";

    console.error(`[db] ${errorMessage}: ${detail}`);
    throw new Error(errorMessage);
  }
}

async function initSchemaOnce(): Promise<void> {
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

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  runPsql([databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], "Database schema initialization failed");
  schemaReady = true;
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (schemaReady) return;
  if (!schemaInitPromise) {
    schemaInitPromise = initSchemaOnce().finally(() => {
      if (!schemaReady) {
        schemaInitPromise = null;
      }
    });
  }
  await schemaInitPromise;
}

export function getDatabaseEngine(): DbEngine {
  return "postgres";
}

export function runPostgresJsonQuery<T>(sql: string): T {
  const databaseUrl = getPostgresUrl();
  const wrapped = `WITH t AS (${normalizeSql(sql)}) SELECT COALESCE(json_agg(t), '[]'::json) FROM t;`;
  const output = runPsql(
    [databaseUrl, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", wrapped],
    "Database query failed"
  );

  if (!output) {
    return [] as T;
  }

  return JSON.parse(output) as T;
}

export function runPostgresExec(sql: string): void {
  const databaseUrl = getPostgresUrl();
  runPsql([databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-c", sql], "Database command failed");
}

export function escapeSqlValue(value: string): string {
  return value.replace(/'/g, "''");
}

export const DATA_DIR = "";
export const DB_PATH = "";
