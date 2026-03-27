import { ensureDatabaseSchema } from "@/lib/dbSchema";
import { escapeSql, nowExpression, runExec, runJsonQuery } from "@/lib/sql";

export type AbTestStatus = "draft" | "active" | "paused" | "completed";

export type AbTestRecord = {
  id: number;
  workspace_id: number | null;
  name: string;
  goal: string | null;
  status: AbTestStatus;
  created_by_user_id: number | null;
  created_at: string;
};

export type AbVariantRecord = {
  id: number;
  test_id: number;
  prompt_id: number | null;
  variant_key: string;
  traffic_percent: number;
  created_at: string;
};

function normalizeTest(row: Record<string, unknown>): AbTestRecord {
  return {
    id: Number(row.id),
    workspace_id: row.workspace_id == null ? null : Number(row.workspace_id),
    name: String(row.name ?? ""),
    goal: row.goal == null ? null : String(row.goal),
    status: String(row.status ?? "draft") as AbTestStatus,
    created_by_user_id: row.created_by_user_id == null ? null : Number(row.created_by_user_id),
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeVariant(row: Record<string, unknown>): AbVariantRecord {
  return {
    id: Number(row.id),
    test_id: Number(row.test_id),
    prompt_id: row.prompt_id == null ? null : Number(row.prompt_id),
    variant_key: String(row.variant_key ?? ""),
    traffic_percent: Number(row.traffic_percent ?? 0),
    created_at: String(row.created_at ?? ""),
  };
}

export async function createAbTest(name: string, goal: string | null, createdByUserId?: number | null, workspaceId?: number | null): Promise<AbTestRecord> {
  await ensureDatabaseSchema();

  const userSql = typeof createdByUserId === "number" && Number.isInteger(createdByUserId) ? `${createdByUserId}` : "NULL";
  const workspaceSql = typeof workspaceId === "number" && Number.isInteger(workspaceId) ? `${workspaceId}` : "NULL";
  const goalSql = goal?.trim() ? `'${escapeSql(goal.trim())}'` : "NULL";

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `INSERT INTO ab_tests (workspace_id, name, goal, status, created_by_user_id, created_at)
      VALUES (${workspaceSql}, '${escapeSql(name)}', ${goalSql}, 'draft', ${userSql}, ${nowExpression()})
      RETURNING id, workspace_id, name, goal, status, created_by_user_id, created_at`
  );

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create A/B test");
  }

  return normalizeTest(created);
}

export async function listAbTests(workspaceId?: number | null): Promise<AbTestRecord[]> {
  await ensureDatabaseSchema();

  const where = typeof workspaceId === "number" && Number.isInteger(workspaceId) && workspaceId > 0 ? `WHERE workspace_id = ${workspaceId}` : "";
  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT id, workspace_id, name, goal, status, created_by_user_id, created_at
      FROM ab_tests ${where}
      ORDER BY id DESC`
  );

  return rows.map(normalizeTest);
}

export async function setAbTestStatus(id: number, status: AbTestStatus): Promise<AbTestRecord | null> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `UPDATE ab_tests SET status = '${escapeSql(status)}' WHERE id = ${id}
      RETURNING id, workspace_id, name, goal, status, created_by_user_id, created_at`
  );

  return rows[0] ? normalizeTest(rows[0]) : null;
}

export async function upsertVariant(testId: number, variantKey: string, promptId: number | null, trafficPercent: number): Promise<AbVariantRecord> {
  await ensureDatabaseSchema();

  const promptSql = typeof promptId === "number" && Number.isInteger(promptId) && promptId > 0 ? `${promptId}` : "NULL";
  const safeTraffic = Math.max(0, Math.min(100, Math.round(trafficPercent)));
  const key = escapeSql(variantKey);

  runExec(`INSERT INTO ab_variants (test_id, prompt_id, variant_key, traffic_percent, created_at)
    VALUES (${testId}, ${promptSql}, '${key}', ${safeTraffic}, ${nowExpression()})
    ON CONFLICT (test_id, variant_key)
    DO UPDATE SET prompt_id = EXCLUDED.prompt_id, traffic_percent = EXCLUDED.traffic_percent;`);

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT id, test_id, prompt_id, variant_key, traffic_percent, created_at
      FROM ab_variants
      WHERE test_id = ${testId} AND variant_key = '${key}'
      LIMIT 1`
  );

  const item = rows[0];
  if (!item) {
    throw new Error("Failed to upsert A/B variant");
  }

  return normalizeVariant(item);
}

export async function listAbVariants(testId: number): Promise<AbVariantRecord[]> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT id, test_id, prompt_id, variant_key, traffic_percent, created_at
      FROM ab_variants WHERE test_id = ${testId}
      ORDER BY variant_key ASC`
  );

  return rows.map(normalizeVariant);
}
