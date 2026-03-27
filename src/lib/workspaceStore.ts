import { ensureDatabaseSchema } from "@/lib/dbSchema";
import { escapeSql, nowExpression, runExec, runJsonQuery } from "@/lib/sql";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type WorkspaceRecord = {
  id: number;
  name: string;
  owner_user_id: number;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMemberRecord = {
  workspace_id: number;
  user_id: number;
  role: WorkspaceRole;
  created_at: string;
};

function normalizeWorkspace(row: Record<string, unknown>): WorkspaceRecord {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    owner_user_id: Number(row.owner_user_id),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeMember(row: Record<string, unknown>): WorkspaceMemberRecord {
  return {
    workspace_id: Number(row.workspace_id),
    user_id: Number(row.user_id),
    role: String(row.role ?? "viewer") as WorkspaceRole,
    created_at: String(row.created_at ?? ""),
  };
}

export async function listUserWorkspaces(userId: number): Promise<WorkspaceRecord[]> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT w.id, w.name, w.owner_user_id, w.created_at, w.updated_at
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ${userId}
      ORDER BY w.updated_at DESC, w.id DESC`
  );

  return rows.map(normalizeWorkspace);
}

export async function createWorkspace(name: string, ownerUserId: number): Promise<WorkspaceRecord> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `INSERT INTO workspaces (name, owner_user_id, created_at, updated_at)
      VALUES ('${escapeSql(name)}', ${ownerUserId}, ${nowExpression()}, ${nowExpression()})
      RETURNING id, name, owner_user_id, created_at, updated_at`
  );

  const created = rows[0];
  if (!created) {
    throw new Error("Failed to create workspace");
  }

  const workspace = normalizeWorkspace(created);

  runExec(`INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    VALUES (${workspace.id}, ${ownerUserId}, 'owner', ${nowExpression()})
    ON CONFLICT (workspace_id, user_id) DO NOTHING;`);

  return workspace;
}

export async function listWorkspaceMembers(workspaceId: number): Promise<WorkspaceMemberRecord[]> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT workspace_id, user_id, role, created_at
      FROM workspace_members
      WHERE workspace_id = ${workspaceId}
      ORDER BY created_at ASC, user_id ASC`
  );

  return rows.map(normalizeMember);
}

export async function addWorkspaceMember(workspaceId: number, userId: number, role: WorkspaceRole): Promise<WorkspaceMemberRecord> {
  await ensureDatabaseSchema();

  runExec(`INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    VALUES (${workspaceId}, ${userId}, '${escapeSql(role)}', ${nowExpression()})
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;`);

  const rows = runJsonQuery<Record<string, unknown>[]>(
    `SELECT workspace_id, user_id, role, created_at FROM workspace_members WHERE workspace_id = ${workspaceId} AND user_id = ${userId} LIMIT 1`
  );

  const item = rows[0];
  if (!item) {
    throw new Error("Failed to add workspace member");
  }

  return normalizeMember(item);
}

export async function getWorkspaceRole(workspaceId: number, userId: number): Promise<WorkspaceRole | null> {
  await ensureDatabaseSchema();

  const rows = runJsonQuery<Array<{ role: WorkspaceRole }>>(
    `SELECT role FROM workspace_members WHERE workspace_id = ${workspaceId} AND user_id = ${userId} LIMIT 1`
  );

  return rows[0]?.role ?? null;
}
