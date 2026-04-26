import { getRequestUser } from "@/lib/auth";
import { listUserWorkspaces, type WorkspaceRole } from "@/lib/workspaceStore";

export type SessionUser = {
  id: number;
  email: string;
  name?: string | null;
};

export async function getSessionUserWithRole(req: Request): Promise<{ user: SessionUser | null; role: WorkspaceRole | null }> {
  const user = await getRequestUser(req);
  if (!user?.id) {
    return { user: null, role: null };
  }

  const workspaces = await listUserWorkspaces(user.id);
  const roles = new Set(workspaces.map((item) => item.role).filter(Boolean));
  const role: WorkspaceRole | null = roles.has("owner")
    ? "owner"
    : roles.has("admin")
      ? "admin"
      : roles.has("editor")
        ? "editor"
        : roles.has("viewer")
          ? "viewer"
          : null;

  return {
    user: { id: user.id, email: user.email, name: user.name },
    role,
  };
}

export function isAdminRole(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin";
}