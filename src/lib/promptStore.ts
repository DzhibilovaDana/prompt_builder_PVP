import { ensureDatabaseSchema } from "@/lib/dbSchema";
import { escapeSql, nowExpression, runExec, runJsonQuery } from "@/lib/sql";

export type PromptRecord = {
  id: number;
  user_id: number | null;
  workspace_id: number | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type PromptVersionRecord = {
  id: number;
  prompt_id: number;
  version_no: number;
  title: string;
  content: string;
  changed_by_user_id: number | null;
  change_note: string | null;
  created_at: string;
};

export type AuditLogRecord = {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_user_id: number | null;
  meta_json: string;
  created_at: string;
};

function normalizePromptRow(row: Record<string, unknown>): PromptRecord {
  return {
    id: Number(row.id),
    user_id: row.user_id == null ? null : Number(row.user_id),
    workspace_id: row.workspace_id == null ? null : Number(row.workspace_id),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeVersionRow(row: Record<string, unknown>): PromptVersionRecord {
  return {
    id: Number(row.id),
    prompt_id: Number(row.prompt_id),
    version_no: Number(row.version_no),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    changed_by_user_id: row.changed_by_user_id == null ? null : Number(row.changed_by_user_id),
    change_note: row.change_note == null ? null : String(row.change_note),
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeAuditRow(row: Record<string, unknown>): AuditLogRecord {
  return {
    id: Number(row.id),
    entity_type: String(row.entity_type ?? ""),
    entity_id: String(row.entity_id ?? ""),
    action: String(row.action ?? ""),
    actor_user_id: row.actor_user_id == null ? null : Number(row.actor_user_id),
    meta_json: String(row.meta_json ?? "{}"),
    created_at: String(row.created_at ?? ""),
  };
}

async function createPromptVersion(promptId: number, title: string, content: string, changedByUserId?: number | null, note?: string | null) {
  const countRows = runJsonQuery<Array<{ cnt: number | string }>>(`SELECT COUNT(*) AS cnt FROM prompt_versions WHERE prompt_id = ${promptId};`);
  const versionNo = Number(countRows[0]?.cnt ?? 0) + 1;
  const changedBy = typeof changedByUserId === "number" && Number.isInteger(changedByUserId) ? `${changedByUserId}` : "NULL";
  const noteSql = note ? `'${escapeSql(note)}'` : "NULL";

  runExec(`INSERT INTO prompt_versions (prompt_id, version_no, title, content, changed_by_user_id, change_note, created_at)
    VALUES (${promptId}, ${versionNo}, '${escapeSql(title)}', '${escapeSql(content)}', ${changedBy}, ${noteSql}, ${nowExpression()});`);
}

export async function createAuditLog(
  entityType: string,
  entityId: string,
  action: string,
  actorUserId?: number | null,
  meta?: Record<string, unknown>
): Promise<void> {
  await ensureDatabaseSchema();
  const actorSql = typeof actorUserId === "number" && Number.isInteger(actorUserId) ? `${actorUserId}` : "NULL";
  const metaJson = escapeSql(JSON.stringify(meta ?? {}));

  runExec(`INSERT INTO audit_logs (entity_type, entity_id, action, actor_user_id, meta_json, created_at)
    VALUES ('${escapeSql(entityType)}', '${escapeSql(entityId)}', '${escapeSql(action)}', ${actorSql}, '${metaJson}', ${nowExpression()});`);
}

export async function listAuditLogs(limit = 200): Promise<AuditLogRecord[]> {
  await ensureDatabaseSchema();
  const safeLimit = Math.min(Math.max(1, Number(limit) || 200), 1000);
  const rows = runJsonQuery<Record<string, unknown>[]>(`SELECT id, entity_type, entity_id, action, actor_user_id, meta_json, created_at FROM audit_logs ORDER BY id DESC LIMIT ${safeLimit};`);
  return rows.map(normalizeAuditRow);
}

export async function listPrompts(userId?: number | null, workspaceId?: number | null): Promise<PromptRecord[]> {
  await ensureDatabaseSchema();

  if (!(typeof userId === "number" && Number.isInteger(userId) && userId > 0)) {
    return [];
  }

  const workspaceClause = typeof workspaceId === "number" && Number.isInteger(workspaceId) && workspaceId > 0 ? `AND p.workspace_id = ${workspaceId}` : "";

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT p.id, p.user_id, p.workspace_id, p.title, p.content, p.created_at, p.updated_at
      FROM prompts p
      LEFT JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.user_id = ${userId} OR wm.user_id = ${userId}
      ${workspaceClause}
      GROUP BY p.id, p.user_id, p.workspace_id, p.title, p.content, p.created_at, p.updated_at
      ORDER BY p.created_at DESC, p.id DESC`
  );

  return rows.map((row) => normalizePromptRow(row));
}

export async function getPromptById(id: number): Promise<PromptRecord | null> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT id, user_id, workspace_id, title, content, created_at, updated_at
      FROM prompts
      WHERE id = ${id}
      LIMIT 1`
  );

  return rows[0] ? normalizePromptRow(rows[0]) : null;
}

export async function createPrompt(
  title: string,
  content: string,
  userId?: number | null,
  workspaceId?: number | null,
  changeNote?: string
): Promise<PromptRecord> {
  await ensureDatabaseSchema();

  const t = escapeSql(title);
  const c = escapeSql(content);
  const uid = typeof userId === "number" && Number.isInteger(userId) ? `${userId}` : "NULL";
  const wid = typeof workspaceId === "number" && Number.isInteger(workspaceId) ? `${workspaceId}` : "NULL";
  const now = nowExpression();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `INSERT INTO prompts (user_id, workspace_id, title, content, created_at, updated_at)
      VALUES (${uid}, ${wid}, '${t}', '${c}', ${now}, ${now})
      RETURNING id, user_id, workspace_id, title, content, created_at, updated_at`
  );

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create prompt");
  }

  const normalized = normalizePromptRow(created);
  await createPromptVersion(normalized.id, normalized.title, normalized.content, userId ?? null, changeNote ?? "created");
  await createAuditLog("prompt", String(normalized.id), "created", userId ?? null, { workspaceId: normalized.workspace_id ?? null });
  return normalized;
}

export async function updatePrompt(
  id: number,
  title: string,
  content: string,
  actorUserId?: number | null,
  changeNote?: string | null
): Promise<PromptRecord | null> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `UPDATE prompts
      SET title = '${escapeSql(title)}', content = '${escapeSql(content)}', updated_at = ${nowExpression()}
      WHERE id = ${id}
      RETURNING id, user_id, workspace_id, title, content, created_at, updated_at`
  );

  if (!rows[0]) {
    return null;
  }

  const prompt = normalizePromptRow(rows[0]);
  await createPromptVersion(prompt.id, prompt.title, prompt.content, actorUserId ?? null, changeNote ?? "updated");
  await createAuditLog("prompt", String(prompt.id), "updated", actorUserId ?? null, { title: prompt.title });
  return prompt;
}

export async function deletePrompt(id: number, actorUserId?: number | null): Promise<boolean> {
  await ensureDatabaseSchema();
  const existing = await getPromptById(id);
  if (!existing) return false;

  runExec(`DELETE FROM prompts WHERE id = ${id};`);
  await createAuditLog("prompt", String(id), "deleted", actorUserId ?? null, { title: existing.title });
  return true;
}

export async function listPromptVersions(promptId: number): Promise<PromptVersionRecord[]> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT id, prompt_id, version_no, title, content, changed_by_user_id, change_note, created_at
      FROM prompt_versions
      WHERE prompt_id = ${promptId}
      ORDER BY version_no DESC, id DESC`
  );

  return rows.map((row) => normalizeVersionRow(row));
}

export async function rollbackPromptToVersion(
  promptId: number,
  versionNo: number,
  actorUserId?: number | null
): Promise<PromptRecord | null> {
  await ensureDatabaseSchema();

  const versionRows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT title, content FROM prompt_versions WHERE prompt_id = ${promptId} AND version_no = ${versionNo} LIMIT 1`
  );

  const version = versionRows[0];
  if (!version) {
    return null;
  }

  return updatePrompt(promptId, String(version.title ?? ""), String(version.content ?? ""), actorUserId, `rollback to v${versionNo}`);
}
