import { ensureDatabaseSchema } from "@/lib/dbSchema";
import { escapeSql, nowExpression, runJsonQuery } from "@/lib/sql";
import type { ProviderResult } from "@/lib/inference";

export type PromptRunRecord = {
  id: number;
  prompt_id: number | null;
  user_id: number | null;
  provider: string;
  model: string | null;
  status: string;
  latency_ms: number | null;
  output_text: string | null;
  error_text: string | null;
  created_at: string;
};

export type PromptScoreRecord = {
  id: number;
  prompt_id: number;
  run_id: number | null;
  user_id: number | null;
  score: number;
  criteria: string | null;
  note: string | null;
  created_at: string;
};

function normalizeRun(row: Record<string, unknown>): PromptRunRecord {
  return {
    id: Number(row.id),
    prompt_id: row.prompt_id == null ? null : Number(row.prompt_id),
    user_id: row.user_id == null ? null : Number(row.user_id),
    provider: String(row.provider ?? ""),
    model: row.model == null ? null : String(row.model),
    status: String(row.status ?? ""),
    latency_ms: row.latency_ms == null ? null : Number(row.latency_ms),
    output_text: row.output_text == null ? null : String(row.output_text),
    error_text: row.error_text == null ? null : String(row.error_text),
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeScore(row: Record<string, unknown>): PromptScoreRecord {
  return {
    id: Number(row.id),
    prompt_id: Number(row.prompt_id),
    run_id: row.run_id == null ? null : Number(row.run_id),
    user_id: row.user_id == null ? null : Number(row.user_id),
    score: Number(row.score),
    criteria: row.criteria == null ? null : String(row.criteria),
    note: row.note == null ? null : String(row.note),
    created_at: String(row.created_at ?? ""),
  };
}

export async function logPromptRun(promptId: number | null, userId: number | null, provider: string, result: ProviderResult): Promise<void> {
  await ensureDatabaseSchema();

  const promptSql = typeof promptId === "number" && Number.isInteger(promptId) && promptId > 0 ? `${promptId}` : "NULL";
  const userSql = typeof userId === "number" && Number.isInteger(userId) && userId > 0 ? `${userId}` : "NULL";
  const modelSql = result.model ? `'${escapeSql(result.model)}'` : "NULL";
  const latencySql = typeof result.timeMs === "number" && Number.isFinite(result.timeMs) ? `${Math.max(0, Math.round(result.timeMs))}` : "NULL";
  const outputSql = result.output ? `'${escapeSql(result.output)}'` : "NULL";
  const errorSql = result.error ? `'${escapeSql(result.error)}'` : "NULL";

  runJsonQuery<unknown>(`INSERT INTO prompt_runs (prompt_id, user_id, provider, model, status, latency_ms, output_text, error_text, created_at)
    VALUES (${promptSql}, ${userSql}, '${escapeSql(provider)}', ${modelSql}, '${escapeSql(result.status)}', ${latencySql}, ${outputSql}, ${errorSql}, ${nowExpression()});`);
}

export async function listPromptRuns(promptId: number, limit = 100): Promise<PromptRunRecord[]> {
  await ensureDatabaseSchema();
  const safeLimit = Math.min(Math.max(1, Number(limit) || 100), 1000);

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT id, prompt_id, user_id, provider, model, status, latency_ms, output_text, error_text, created_at
      FROM prompt_runs WHERE prompt_id = ${promptId}
      ORDER BY id DESC LIMIT ${safeLimit}`
  );

  return rows.map(normalizeRun);
}

export async function createPromptScore(
  promptId: number,
  score: number,
  userId?: number | null,
  runId?: number | null,
  criteria?: string | null,
  note?: string | null
): Promise<PromptScoreRecord> {
  await ensureDatabaseSchema();

  const safeScore = Math.max(1, Math.min(5, Math.round(score)));
  const userSql = typeof userId === "number" && Number.isInteger(userId) && userId > 0 ? `${userId}` : "NULL";
  const runSql = typeof runId === "number" && Number.isInteger(runId) && runId > 0 ? `${runId}` : "NULL";
  const criteriaSql = criteria?.trim() ? `'${escapeSql(criteria.trim())}'` : "NULL";
  const noteSql = note?.trim() ? `'${escapeSql(note.trim())}'` : "NULL";

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `INSERT INTO prompt_scores (prompt_id, run_id, user_id, score, criteria, note, created_at)
      VALUES (${promptId}, ${runSql}, ${userSql}, ${safeScore}, ${criteriaSql}, ${noteSql}, ${nowExpression()})
      RETURNING id, prompt_id, run_id, user_id, score, criteria, note, created_at`
  );

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create score");
  }

  return normalizeScore(created);
}

export async function listPromptScores(promptId: number, limit = 100): Promise<PromptScoreRecord[]> {
  await ensureDatabaseSchema();
  const safeLimit = Math.min(Math.max(1, Number(limit) || 100), 1000);

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT id, prompt_id, run_id, user_id, score, criteria, note, created_at
      FROM prompt_scores
      WHERE prompt_id = ${promptId}
      ORDER BY id DESC LIMIT ${safeLimit}`
  );

  return rows.map(normalizeScore);
}

export async function getPromptMetricsSummary(promptId: number): Promise<{
  runs: number;
  successRuns: number;
  errorRuns: number;
  avgLatencyMs: number | null;
  avgScore: number | null;
}> {
  await ensureDatabaseSchema();

  const runStats = runJsonQuery<Array<{ runs: number | string; success_runs: number | string; error_runs: number | string; avg_latency_ms: number | string | null }>>(
    `SELECT COUNT(*) AS runs,
      SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS success_runs,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_runs,
      AVG(latency_ms) AS avg_latency_ms
      FROM prompt_runs
      WHERE prompt_id = ${promptId}`
  )[0];

  const scoreStats = runJsonQuery<Array<{ avg_score: number | string | null }>>(
    `SELECT AVG(score) AS avg_score FROM prompt_scores WHERE prompt_id = ${promptId}`
  )[0];

  return {
    runs: Number(runStats?.runs ?? 0),
    successRuns: Number(runStats?.success_runs ?? 0),
    errorRuns: Number(runStats?.error_runs ?? 0),
    avgLatencyMs: runStats?.avg_latency_ms == null ? null : Number(runStats.avg_latency_ms),
    avgScore: scoreStats?.avg_score == null ? null : Number(scoreStats.avg_score),
  };
}
