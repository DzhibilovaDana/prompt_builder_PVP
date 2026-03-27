import { execFileSync } from "child_process";
import { DB_PATH, ensureDatabaseSchema, escapeSqlValue, getDatabaseEngine, runPostgresExec, runPostgresJsonQuery } from "@/lib/dbSchema";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type WorkspaceRecord = {
  id: number;
  name: string;
  owner_user_id: number | null;
  created_at: string;
  role?: WorkspaceRole;
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

function normalizeWorkspaceRow(row: Record<string, unknown>): WorkspaceRecord {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    owner_user_id: row.owner_user_id == null ? null : Number(row.owner_user_id),
    created_at: String(row.created_at ?? ""),
    role: row.role ? (String(row.role) as WorkspaceRole) : undefined,
  };
}

function isValidRole(role: string): role is WorkspaceRole {
  return role === "owner" || role === "admin" || role === "editor" || role === "viewer";
}

export async function createWorkspace(name: string, ownerUserId: number): Promise<WorkspaceRecord> {
  await ensureDatabaseSchema();
  const normalizedName = name.trim() || `Workspace ${ownerUserId}`;

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(`
      INSERT INTO workspaces (name, owner_user_id)
      VALUES ('${escapeSqlValue(normalizedName)}', ${ownerUserId})
      RETURNING id, name, owner_user_id, created_at::text AS created_at
    `);
    const created = rows[0];
    if (!created) throw new Error("Failed to create workspace");

    runPostgresExec(`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (${Number(created.id)}, ${ownerUserId}, 'owner')
      ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';
    `);

    return normalizeWorkspaceRow(created);
  }

  runSqlite<unknown>(
    `INSERT INTO workspaces (name, owner_user_id, created_at) VALUES ('${escapeSqlValue(normalizedName)}', ${ownerUserId}, datetime('now'));`
  );
  const wsRows = runSqlite<WorkspaceRecord[]>("SELECT id, name, owner_user_id, created_at FROM workspaces ORDER BY id DESC LIMIT 1;");
  const ws = wsRows[0];
  if (!ws) throw new Error("Failed to create workspace");
  runSqlite<unknown>(
    `INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (${ws.id}, ${ownerUserId}, 'owner', datetime('now'));`
  );
  return ws;
}

export async function ensurePersonalWorkspace(userId: number, userName?: string | null): Promise<WorkspaceRecord> {
  await ensureDatabaseSchema();

  const existing = await listUserWorkspaces(userId);
  const own = existing.find((w) => w.role === "owner");
  if (own) return own;

  const workspaceName = userName?.trim() ? `${userName.trim()} workspace` : `User ${userId} workspace`;
  return createWorkspace(workspaceName, userId);
}

export async function listUserWorkspaces(userId: number): Promise<WorkspaceRecord[]> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(`
      SELECT w.id, w.name, w.owner_user_id, w.created_at::text AS created_at, m.role
      FROM workspace_members m
      JOIN workspaces w ON w.id = m.workspace_id
      WHERE m.user_id = ${userId}
      ORDER BY w.created_at DESC, w.id DESC
    `);
    return rows.map((row) => normalizeWorkspaceRow(row));
  }

  return runSqlite<WorkspaceRecord[]>(`
    SELECT w.id, w.name, w.owner_user_id, w.created_at, m.role
    FROM workspace_members m
    JOIN workspaces w ON w.id = m.workspace_id
    WHERE m.user_id = ${userId}
    ORDER BY datetime(w.created_at) DESC, w.id DESC;
  `);
}

export async function getWorkspaceRoleForUser(workspaceId: number, userId: number): Promise<WorkspaceRole | null> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    const rows = runPostgresJsonQuery<Record<string, unknown>[]>(`
      SELECT role
      FROM workspace_members
      WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
      LIMIT 1
    `);
    const role = rows[0]?.role;
    return typeof role === "string" && isValidRole(role) ? role : null;
  }

  const rows = runSqlite<Array<{ role: string }>>(
    `SELECT role FROM workspace_members WHERE workspace_id = ${workspaceId} AND user_id = ${userId} LIMIT 1;`
  );
  const role = rows[0]?.role;
  return typeof role === "string" && isValidRole(role) ? role : null;
}

export async function addWorkspaceMember(workspaceId: number, userId: number, role: WorkspaceRole): Promise<void> {
  await ensureDatabaseSchema();

  if (getDatabaseEngine() === "postgres") {
    runPostgresExec(`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (${workspaceId}, ${userId}, '${escapeSqlValue(role)}')
      ON CONFLICT (workspace_id, user_id)
      DO UPDATE SET role = EXCLUDED.role;
    `);
    return;
  }

  runSqlite<unknown>(
    `INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (${workspaceId}, ${userId}, '${escapeSqlValue(role)}', datetime('now'));`
  );
}

export async function canWriteWorkspace(workspaceId: number, userId: number): Promise<boolean> {
  const role = await getWorkspaceRoleForUser(workspaceId, userId);
  return role === "owner" || role === "admin" || role === "editor";
}

export async function canManageWorkspace(workspaceId: number, userId: number): Promise<boolean> {
  const role = await getWorkspaceRoleForUser(workspaceId, userId);
  return role === "owner" || role === "admin";
}
