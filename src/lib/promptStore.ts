import { execFileSync } from "child_process";
import { DB_PATH, ensureDatabaseSchema, escapeSqlValue, getDatabaseEngine, runPostgresExec, runPostgresJsonQuery } from "@/lib/dbSchema";

export type PromptRecord = {
  id: number;
  user_id: number | null;
  workspace_id: number | null;
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PromptVersionRecord = {
  id: number;
  prompt_id: number;
  version_no: number;
  title: string;
  content: string;
  author_user_id: number | null;
  created_at: string;
};

export type PromptRunRecord = {
  id: number;
  prompt_id: number | null;
  provider: string;
  model: string | null;
  status: string;
  latency_ms: number | null;
  output_chars: number;
  error: string | null;
  created_at: string;
};

export type PromptScoreInput = {
  promptId: number;
  runId?: number | null;
  userId?: number | null;
  score: number;
  note?: string | null;
};

function runSqlite<T>(sql: string): T {
  const output = execFileSync("sqlite3", ["-json", DB_PATH, sql], {
    encoding: "utf-8",
  }).trim();

  if (!output) {
    return [] as T;
  }

  return JSON.parse(output) as T;
}

function normalizePromptRow(row: Record<string, unknown>): PromptRecord {
  const tagsRaw = Array.isArray(row.tags_json) ? row.tags_json : [];
  const metadataRaw = row.metadata_json && typeof row.metadata_json === "object" ? row.metadata_json : {};
  return {
    id: Number(row.id),
    user_id: row.user_id == null ? null : Number(row.user_id),
    workspace_id: row.workspace_id == null ? null : Number(row.workspace_id),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    category: row.category == null ? null : String(row.category),
    tags: tagsRaw.map((tag) => String(tag)).filter(Boolean),
    metadata: metadataRaw as Record<string, unknown>,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}

function normalizeTags(input?: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const uniq = new Set<string>();
  for (const value of input) {
    const tag = String(value ?? "").trim();
    if (tag) uniq.add(tag.toLowerCase());
  }
  return Array.from(uniq);
}

function normalizeMetadata(input?: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

export type PromptFilters = {
  workspaceId?: number | null;
  query?: string | null;
  category?: string | null;
  tags?: string[] | null;
  limit?: number | null;
  offset?: number | null;
};

function normalizeVersionRow(row: Record<string, unknown>): PromptVersionRecord {
  return {
    id: Number(row.id),
    prompt_id: Number(row.prompt_id),
    version_no: Number(row.version_no),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    author_user_id: row.author_user_id == null ? null : Number(row.author_user_id),
    created_at: String(row.created_at ?? ""),
  };
}

function toSafeJsonbLiteral(value: unknown): string {
  return `'${escapeSqlValue(JSON.stringify(value))}'::jsonb`;
}

function parseNonNegativeInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function normalizeRunRow(row: Record<string, unknown>): PromptRunRecord {
  return {
    id: Number(row.id),
    prompt_id: row.prompt_id == null ? null : Number(row.prompt_id),
    provider: String(row.provider ?? ""),
    model: row.model == null ? null : String(row.model),
    status: String(row.status ?? ""),
    latency_ms: row.latency_ms == null ? null : Number(row.latency_ms),
    output_chars: Number(row.output_chars ?? 0),
    error: row.error == null ? null : String(row.error),
    created_at: String(row.created_at ?? ""),
  };
}

async function appendPromptVersion(promptId: number, title: string, content: string, authorUserId?: number | null): Promise<void> {
  const author = typeof authorUserId === "number" && Number.isInteger(authorUserId) ? `${authorUserId}` : "NULL";
  const t = escapeSqlValue(title);
  const c = escapeSqlValue(content);

  if (getDatabaseEngine() === "postgres") {
    runPostgresExec(`
      WITH v AS (
        SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
        FROM prompt_versions
        WHERE prompt_id = ${promptId}
      )
      INSERT INTO prompt_versions (prompt_id, version_no, title, content, author_user_id)
      SELECT ${promptId}, v.next_version, '${t}', '${c}', ${author}
      FROM v;
    `);
    return;
  }

  runSqlite<unknown>(`
    INSERT INTO prompt_versions (prompt_id, version_no, title, content, author_user_id, created_at)
    VALUES (
      ${promptId},
      (SELECT COALESCE(MAX(version_no), 0) + 1 FROM prompt_versions WHERE prompt_id = ${promptId}),
      '${t}',
      '${c}',
      ${author},
      datetime('now')
    );
  `);
}

export async function addAuditLog(params: {
  entityType: string;
  entityId?: number | null;
  action: string;
  actorUserId?: number | null;
  workspaceId?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await ensureDatabaseSchema();
  const entityId = typeof params.entityId === "number" && Number.isInteger(params.entityId) ? `${params.entityId}` : "NULL";
  const actorUserId = typeof params.actorUserId === "number" && Number.isInteger(params.actorUserId) ? `${params.actorUserId}` : "NULL";
  const workspaceId = typeof params.workspaceId === "number" && Number.isInteger(params.workspaceId) ? `${params.workspaceId}` : "NULL";
  const metadata = params.metadata ? JSON.stringify(params.metadata) : "{}";

  if (getDatabaseEngine() === "postgres") {
    runPostgresExec(`
      INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, workspace_id, metadata_json)
      VALUES (
        '${escapeSqlValue(params.entityType)}',
        ${entityId},
        '${escapeSqlValue(params.action)}',
        ${actorUserId},
        ${workspaceId},
        '${escapeSqlValue(metadata)}'::jsonb
      );
    `);
    return;
  }

  runSqlite<unknown>(`
    INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, workspace_id, metadata_json, created_at)
    VALUES (
      '${escapeSqlValue(params.entityType)}',
      ${entityId},
      '${escapeSqlValue(params.action)}',
      ${actorUserId},
      ${workspaceId},
      '${escapeSqlValue(metadata)}',
      datetime('now')
    );
  `);
}

export async function listPrompts(userId?: number | null, filters?: PromptFilters): Promise<PromptRecord[]> {
  await ensureDatabaseSchema();

  const hasUser = typeof userId === "number" && Number.isInteger(userId) && userId > 0;
  if (!hasUser) return [];

  const limit = Math.min(100, Math.max(1, parseNonNegativeInt(filters?.limit ?? 50, 50)));
  const offset = parseNonNegativeInt(filters?.offset ?? 0, 0);
  const clauses = [`user_id = ${userId}`];
  if (filters?.workspaceId && Number.isInteger(filters.workspaceId) && filters.workspaceId > 0) {
    clauses.push(`workspace_id = ${filters.workspaceId}`);
  }
  if (filters?.query) {
    const normalizedQuery = escapeSqlValue(filters.query.trim());
    if (normalizedQuery) {
      clauses.push(
        `to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')) @@ plainto_tsquery('simple', '${normalizedQuery}')`
      );
    }
  }
  if (filters?.category) {
    clauses.push(`category = '${escapeSqlValue(filters.category)}'`);
  }
  const normalizedTags = normalizeTags(filters?.tags);
  if (normalizedTags.length > 0) {
    clauses.push(`tags_json @> ${toSafeJsonbLiteral(normalizedTags)}`);
  }
  const where = clauses.join(" AND ");

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(
      `SELECT id, user_id, workspace_id, title, content, category, tags_json, metadata_json, created_at::text AS created_at, updated_at::text AS updated_at
       FROM prompts
       WHERE ${where}
       ORDER BY created_at DESC, id DESC
       LIMIT ${limit}
       OFFSET ${offset}`
    );
    return rows.map((row) => normalizePromptRow(row));
  }

  const rows = runSqlite<Record<string, unknown>[]>(
    `SELECT id, user_id, workspace_id, title, content, category, tags_json, metadata_json, created_at, updated_at
     FROM prompts WHERE ${where}
     ORDER BY datetime(created_at) DESC, id DESC
     LIMIT ${limit} OFFSET ${offset};`
  );
  return rows.map((row) => normalizePromptRow(row));
}

export async function getPromptById(id: number): Promise<PromptRecord | null> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(
      `SELECT id, user_id, workspace_id, title, content, category, tags_json, metadata_json, created_at::text AS created_at, updated_at::text AS updated_at
       FROM prompts
       WHERE id = ${id}
       LIMIT 1`
    );
    return rows[0] ? normalizePromptRow(rows[0]) : null;
  }

  const rows = runSqlite<Record<string, unknown>[]>(
    `SELECT id, user_id, workspace_id, title, content, category, tags_json, metadata_json, created_at, updated_at FROM prompts WHERE id = ${id} LIMIT 1;`
  );
  return rows[0] ? normalizePromptRow(rows[0]) : null;
}

export async function createPrompt(
  title: string,
  content: string,
  userId?: number | null,
  workspaceId?: number | null,
  options?: { category?: string | null; tags?: string[]; metadata?: Record<string, unknown> },
): Promise<PromptRecord> {
  await ensureDatabaseSchema();

  const t = escapeSqlValue(title);
  const c = escapeSqlValue(content);
  const uid = typeof userId === "number" && Number.isInteger(userId) ? `${userId}` : "NULL";
  const wid = typeof workspaceId === "number" && Number.isInteger(workspaceId) ? `${workspaceId}` : "NULL";
  const category = options?.category?.trim() ? `'${escapeSqlValue(options.category.trim())}'` : "NULL";
  const tags = toSafeJsonbLiteral(normalizeTags(options?.tags));
  const metadata = toSafeJsonbLiteral(normalizeMetadata(options?.metadata));

  let created: PromptRecord | null = null;

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(
      `INSERT INTO prompts (user_id, workspace_id, title, content, category, tags_json, metadata_json)
       VALUES (${uid}, ${wid}, '${t}', '${c}', ${category}, ${tags}, ${metadata})
       RETURNING id, user_id, workspace_id, title, content, category, tags_json, metadata_json, created_at::text AS created_at, updated_at::text AS updated_at`
    );
    created = rows[0] ? normalizePromptRow(rows[0]) : null;
  } else {
    runSqlite<unknown>(
      `INSERT INTO prompts (user_id, workspace_id, title, content, category, tags_json, metadata_json, created_at, updated_at)
       VALUES (${uid}, ${wid}, '${t}', '${c}', ${category}, '${escapeSqlValue(JSON.stringify(normalizeTags(options?.tags)))}', '${escapeSqlValue(JSON.stringify(normalizeMetadata(options?.metadata)))}', datetime('now'), datetime('now'));`
    );

    const rows = runSqlite<Record<string, unknown>[]>(
      "SELECT id, user_id, workspace_id, title, content, category, tags_json, metadata_json, created_at, updated_at FROM prompts ORDER BY id DESC LIMIT 1;"
    );
    created = rows[0] ? normalizePromptRow(rows[0]) : null;
  }

  if (!created) {
    throw new Error("Failed to create prompt");
  }

  await appendPromptVersion(created.id, created.title, created.content, userId ?? null);
  await addAuditLog({
    entityType: "prompt",
    entityId: created.id,
    action: "create",
    actorUserId: userId ?? null,
    workspaceId: created.workspace_id,
    metadata: { title: created.title },
  });

  return created;
}

export async function updatePrompt(
  id: number,
  title: string,
  content: string,
  actorUserId?: number | null,
  options?: { category?: string | null; tags?: string[]; metadata?: Record<string, unknown> },
): Promise<PromptRecord | null> {
  await ensureDatabaseSchema();
  const existing = await getPromptById(id);
  if (!existing) return null;

  const t = escapeSqlValue(title);
  const c = escapeSqlValue(content);
  const category = options?.category?.trim() ? `'${escapeSqlValue(options.category.trim())}'` : "NULL";
  const tagsJson = toSafeJsonbLiteral(normalizeTags(options?.tags));
  const metadataJson = toSafeJsonbLiteral(normalizeMetadata(options?.metadata));

  let updated: PromptRecord | null = null;

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(`
      UPDATE prompts
      SET title = '${t}', content = '${c}', category = ${category}, tags_json = ${tagsJson}, metadata_json = ${metadataJson}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, user_id, workspace_id, title, content, category, tags_json, metadata_json, created_at::text AS created_at, updated_at::text AS updated_at
    `);
    updated = rows[0] ? normalizePromptRow(rows[0]) : null;
  } else {
    runSqlite<unknown>(
      `UPDATE prompts
       SET title = '${t}', content = '${c}', category = ${category},
           tags_json = '${escapeSqlValue(JSON.stringify(normalizeTags(options?.tags)))}',
           metadata_json = '${escapeSqlValue(JSON.stringify(normalizeMetadata(options?.metadata)))}',
           updated_at = datetime('now')
       WHERE id = ${id};`
    );
    const rows = runSqlite<Record<string, unknown>[]>(
      `SELECT id, user_id, workspace_id, title, content, category, tags_json, metadata_json, created_at, updated_at FROM prompts WHERE id = ${id} LIMIT 1;`
    );
    updated = rows[0] ? normalizePromptRow(rows[0]) : null;
  }

  if (!updated) return null;

  await appendPromptVersion(updated.id, updated.title, updated.content, actorUserId ?? null);
  await addAuditLog({
    entityType: "prompt",
    entityId: updated.id,
    action: "update",
    actorUserId: actorUserId ?? null,
    workspaceId: updated.workspace_id,
    metadata: { previousTitle: existing.title, updatedTitle: updated.title },
  });

  return updated;
}

export async function deletePrompt(id: number, actorUserId?: number | null): Promise<boolean> {
  await ensureDatabaseSchema();
  const existing = await getPromptById(id);
  if (!existing) return false;

  if (getDatabaseEngine() === "postgres") {
    runPostgresExec(`DELETE FROM prompts WHERE id = ${id};`);
  } else {
    runSqlite<unknown>(`DELETE FROM prompts WHERE id = ${id};`);
  }

  await addAuditLog({
    entityType: "prompt",
    entityId: existing.id,
    action: "delete",
    actorUserId: actorUserId ?? null,
    workspaceId: existing.workspace_id,
    metadata: { title: existing.title },
  });
  return true;
}

export async function listPromptVersions(promptId: number): Promise<PromptVersionRecord[]> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(`
      SELECT id, prompt_id, version_no, title, content, author_user_id, created_at::text AS created_at
      FROM prompt_versions
      WHERE prompt_id = ${promptId}
      ORDER BY version_no DESC
    `);
    return rows.map((row) => normalizeVersionRow(row));
  }

  const rows = runSqlite<PromptVersionRecord[]>(`
    SELECT id, prompt_id, version_no, title, content, author_user_id, created_at
    FROM prompt_versions
    WHERE prompt_id = ${promptId}
    ORDER BY version_no DESC;
  `);
  return rows;
}

export async function rollbackPromptToVersion(promptId: number, versionNo: number, actorUserId?: number | null): Promise<PromptRecord | null> {
  await ensureDatabaseSchema();

  let row: PromptVersionRecord | null = null;
  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(`
      SELECT id, prompt_id, version_no, title, content, author_user_id, created_at::text AS created_at
      FROM prompt_versions
      WHERE prompt_id = ${promptId} AND version_no = ${versionNo}
      LIMIT 1
    `);
    row = rows[0] ? normalizeVersionRow(rows[0]) : null;
  } else {
    const rows = runSqlite<PromptVersionRecord[]>(`
      SELECT id, prompt_id, version_no, title, content, author_user_id, created_at
      FROM prompt_versions
      WHERE prompt_id = ${promptId} AND version_no = ${versionNo}
      LIMIT 1;
    `);
    row = rows[0] ?? null;
  }

  if (!row) return null;
  return updatePrompt(promptId, row.title, row.content, actorUserId ?? null);
}

export async function createPromptRun(input: {
  promptId?: number | null;
  userId?: number | null;
  workspaceId?: number | null;
  provider: string;
  model?: string | null;
  status: "ok" | "error" | "pending";
  latencyMs?: number | null;
  promptChars: number;
  outputChars?: number;
  error?: string | null;
}): Promise<number> {
  await ensureDatabaseSchema();

  const promptId = typeof input.promptId === "number" && Number.isInteger(input.promptId) ? `${input.promptId}` : "NULL";
  const userId = typeof input.userId === "number" && Number.isInteger(input.userId) ? `${input.userId}` : "NULL";
  const workspaceId = typeof input.workspaceId === "number" && Number.isInteger(input.workspaceId) ? `${input.workspaceId}` : "NULL";
  const model = input.model ? `'${escapeSqlValue(input.model)}'` : "NULL";
  const latencyMs = typeof input.latencyMs === "number" ? `${Math.max(0, Math.round(input.latencyMs))}` : "NULL";
  const outputChars = Math.max(0, Math.round(input.outputChars ?? 0));
  const error = input.error ? `'${escapeSqlValue(input.error)}'` : "NULL";

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Array<{ id: number }>>(`
      INSERT INTO prompt_runs (prompt_id, user_id, workspace_id, provider, model, status, latency_ms, prompt_chars, output_chars, error)
      VALUES (
        ${promptId},
        ${userId},
        ${workspaceId},
        '${escapeSqlValue(input.provider)}',
        ${model},
        '${escapeSqlValue(input.status)}',
        ${latencyMs},
        ${Math.max(0, Math.round(input.promptChars))},
        ${outputChars},
        ${error}
      )
      RETURNING id
    `);
    return Number(rows[0]?.id ?? 0);
  }

  runSqlite<unknown>(`
    INSERT INTO prompt_runs (prompt_id, user_id, workspace_id, provider, model, status, latency_ms, prompt_chars, output_chars, error, created_at)
    VALUES (
      ${promptId},
      ${userId},
      ${workspaceId},
      '${escapeSqlValue(input.provider)}',
      ${model},
      '${escapeSqlValue(input.status)}',
      ${latencyMs},
      ${Math.max(0, Math.round(input.promptChars))},
      ${outputChars},
      ${error},
      datetime('now')
    );
  `);
  const rows = runSqlite<Array<{ id: number }>>("SELECT id FROM prompt_runs ORDER BY id DESC LIMIT 1;");
  return Number(rows[0]?.id ?? 0);
}

export async function createPromptScore(input: PromptScoreInput): Promise<number> {
  await ensureDatabaseSchema();
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    throw new Error("score must be integer 1..5");
  }

  const runId = typeof input.runId === "number" && Number.isInteger(input.runId) ? `${input.runId}` : "NULL";
  const userId = typeof input.userId === "number" && Number.isInteger(input.userId) ? `${input.userId}` : "NULL";
  const note = input.note ? `'${escapeSqlValue(input.note)}'` : "NULL";

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Array<{ id: number }>>(`
      INSERT INTO prompt_scores (prompt_id, run_id, user_id, score, note)
      VALUES (${input.promptId}, ${runId}, ${userId}, ${input.score}, ${note})
      RETURNING id
    `);
    return Number(rows[0]?.id ?? 0);
  }

  runSqlite<unknown>(`
    INSERT INTO prompt_scores (prompt_id, run_id, user_id, score, note, created_at)
    VALUES (${input.promptId}, ${runId}, ${userId}, ${input.score}, ${note}, datetime('now'));
  `);
  const rows = runSqlite<Array<{ id: number }>>("SELECT id FROM prompt_scores ORDER BY id DESC LIMIT 1;");
  return Number(rows[0]?.id ?? 0);
}

export async function getPromptMetrics(promptId: number): Promise<{
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
  avgLatencyMs: number;
  avgScore: number | null;
  runsByProvider: Array<{ provider: string; runs: number; successRuns: number; avgLatencyMs: number }>;
  recentRuns: PromptRunRecord[];
}> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    const [summary] = runPostgresJsonQuery<Array<Record<string, unknown>>>(`
      SELECT
        COUNT(*)::int AS total_runs,
        SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END)::int AS success_runs,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)::int AS error_runs,
        COALESCE(AVG(latency_ms), 0)::float AS avg_latency_ms,
        (SELECT AVG(score)::float FROM prompt_scores WHERE prompt_id = ${promptId}) AS avg_score
      FROM prompt_runs
      WHERE prompt_id = ${promptId}
    `);

    const byProvider = runPostgresJsonQuery<Array<Record<string, unknown>>>(`
      SELECT provider,
             COUNT(*)::int AS runs,
             SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END)::int AS success_runs,
             COALESCE(AVG(latency_ms), 0)::float AS avg_latency_ms
      FROM prompt_runs
      WHERE prompt_id = ${promptId}
      GROUP BY provider
      ORDER BY runs DESC, provider ASC
    `);

    const recent = runPostgresJsonQuery<Record<string, unknown>[]>(`
      SELECT id, prompt_id, provider, model, status, latency_ms, output_chars, error, created_at::text AS created_at
      FROM prompt_runs
      WHERE prompt_id = ${promptId}
      ORDER BY created_at DESC, id DESC
      LIMIT 20
    `);

    return {
      totalRuns: Number(summary?.total_runs ?? 0),
      successRuns: Number(summary?.success_runs ?? 0),
      errorRuns: Number(summary?.error_runs ?? 0),
      avgLatencyMs: Number(summary?.avg_latency_ms ?? 0),
      avgScore: summary?.avg_score == null ? null : Number(summary.avg_score),
      runsByProvider: byProvider.map((r) => ({
        provider: String(r.provider ?? ""),
        runs: Number(r.runs ?? 0),
        successRuns: Number(r.success_runs ?? 0),
        avgLatencyMs: Number(r.avg_latency_ms ?? 0),
      })),
      recentRuns: recent.map((r) => normalizeRunRow(r)),
    };
  }

  const summary = runSqlite<Array<Record<string, unknown>>>(`
    SELECT
      COUNT(*) AS total_runs,
      COALESCE(SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END), 0) AS success_runs,
      COALESCE(SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END), 0) AS error_runs,
      COALESCE(AVG(latency_ms), 0) AS avg_latency_ms,
      (SELECT AVG(score) FROM prompt_scores WHERE prompt_id = ${promptId}) AS avg_score
    FROM prompt_runs
    WHERE prompt_id = ${promptId};
  `)[0];

  const byProvider = runSqlite<Array<Record<string, unknown>>>(`
    SELECT
      provider,
      COUNT(*) AS runs,
      COALESCE(SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END), 0) AS success_runs,
      COALESCE(AVG(latency_ms), 0) AS avg_latency_ms
    FROM prompt_runs
    WHERE prompt_id = ${promptId}
    GROUP BY provider
    ORDER BY runs DESC, provider ASC;
  `);

  const recent = runSqlite<Record<string, unknown>[]>(`
    SELECT id, prompt_id, provider, model, status, latency_ms, output_chars, error, created_at
    FROM prompt_runs
    WHERE prompt_id = ${promptId}
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 20;
  `);

  return {
    totalRuns: Number(summary?.total_runs ?? 0),
    successRuns: Number(summary?.success_runs ?? 0),
    errorRuns: Number(summary?.error_runs ?? 0),
    avgLatencyMs: Number(summary?.avg_latency_ms ?? 0),
    avgScore: summary?.avg_score == null ? null : Number(summary.avg_score),
    runsByProvider: byProvider.map((r) => ({
      provider: String(r.provider ?? ""),
      runs: Number(r.runs ?? 0),
      successRuns: Number(r.success_runs ?? 0),
      avgLatencyMs: Number(r.avg_latency_ms ?? 0),
    })),
    recentRuns: recent.map((r) => normalizeRunRow(r)),
  };
}
