import { execFileSync } from "child_process";
import { DB_PATH, ensureDatabaseSchema, escapeSqlValue, getDatabaseEngine, runPostgresExec, runPostgresJsonQuery } from "@/lib/dbSchema";

function runSqlite<T>(sql: string): T {
  const output = execFileSync("sqlite3", ["-json", DB_PATH, sql], { encoding: "utf-8" }).trim();
  return output ? (JSON.parse(output) as T) : ([] as T);
}

export async function createAbTest(input: {
  workspaceId?: number | null;
  name: string;
  promptId?: number | null;
  createdBy?: number | null;
  variants: Array<{ label: string; promptText: string }>;
}): Promise<number> {
  await ensureDatabaseSchema();
  if (input.variants.length < 2) throw new Error("At least 2 variants are required");

  const workspaceId = typeof input.workspaceId === "number" ? `${input.workspaceId}` : "NULL";
  const promptId = typeof input.promptId === "number" ? `${input.promptId}` : "NULL";
  const createdBy = typeof input.createdBy === "number" ? `${input.createdBy}` : "NULL";

  let testId = 0;
  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Array<{ id: number }>>(`
      INSERT INTO ab_tests (workspace_id, name, prompt_id, created_by)
      VALUES (${workspaceId}, '${escapeSqlValue(input.name)}', ${promptId}, ${createdBy})
      RETURNING id
    `);
    testId = Number(rows[0]?.id ?? 0);

    for (const variant of input.variants) {
      runPostgresExec(`
        INSERT INTO ab_test_variants (test_id, label, prompt_text)
        VALUES (${testId}, '${escapeSqlValue(variant.label)}', '${escapeSqlValue(variant.promptText)}');
      `);
    }
  } else {
    runSqlite<unknown>(`
      INSERT INTO ab_tests (workspace_id, name, prompt_id, created_by, created_at)
      VALUES (${workspaceId}, '${escapeSqlValue(input.name)}', ${promptId}, ${createdBy}, datetime('now'));
    `);
    const rows = runSqlite<Array<{ id: number }>>("SELECT id FROM ab_tests ORDER BY id DESC LIMIT 1;");
    testId = Number(rows[0]?.id ?? 0);

    for (const variant of input.variants) {
      runSqlite<unknown>(`
        INSERT INTO ab_test_variants (test_id, label, prompt_text, created_at)
        VALUES (${testId}, '${escapeSqlValue(variant.label)}', '${escapeSqlValue(variant.promptText)}', datetime('now'));
      `);
    }
  }

  return testId;
}

export async function listAbTests(workspaceId?: number | null): Promise<Array<Record<string, unknown>>> {
  await ensureDatabaseSchema();
  const where = typeof workspaceId === "number" ? `WHERE t.workspace_id = ${workspaceId}` : "";

  if (getDatabaseEngine() === "postgres") {
    return runPostgresJsonQuery<Array<Record<string, unknown>>>(`
      SELECT t.id, t.workspace_id, t.name, t.prompt_id, t.status, t.created_by, t.created_at::text AS created_at,
             COUNT(v.id)::int AS variants
      FROM ab_tests t
      LEFT JOIN ab_test_variants v ON v.test_id = t.id
      ${where}
      GROUP BY t.id
      ORDER BY t.created_at DESC, t.id DESC
    `);
  }

  return runSqlite<Array<Record<string, unknown>>>(`
    SELECT t.id, t.workspace_id, t.name, t.prompt_id, t.status, t.created_by, t.created_at,
           COUNT(v.id) AS variants
    FROM ab_tests t
    LEFT JOIN ab_test_variants v ON v.test_id = t.id
    ${where}
    GROUP BY t.id
    ORDER BY datetime(t.created_at) DESC, t.id DESC;
  `);
}

export async function trackAbResult(testId: number, variantLabel: string, success: boolean): Promise<void> {
  await ensureDatabaseSchema();
  const note = success ? "success" : "failure";
  if (getDatabaseEngine() === "postgres") {
    runPostgresExec(`
      INSERT INTO audit_log (entity_type, entity_id, action, metadata_json)
      VALUES ('ab_test', ${testId}, 'result', '{"variant":"${escapeSqlValue(variantLabel)}","result":"${note}"}'::jsonb);
    `);
    return;
  }

  runSqlite<unknown>(`
    INSERT INTO audit_log (entity_type, entity_id, action, metadata_json, created_at)
    VALUES ('ab_test', ${testId}, 'result', '{"variant":"${escapeSqlValue(variantLabel)}","result":"${note}"}', datetime('now'));
  `);
}
