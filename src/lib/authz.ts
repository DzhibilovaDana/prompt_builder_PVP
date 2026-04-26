import { getRequestUser } from "@/lib/auth";
import { listUserWorkspaces, type WorkspaceRole } from "@/lib/workspaceStore";

export type SessionUser = {
  id: number;
  email: string;
  name?: string | null;
};

export async function getSessionUserWithRole(req: Request): Promise<{ user: SessionUser | null; role: WorkspaceRole | null; isAdmin: boolean; mustChangePassword: boolean }> {
  const user = await getRequestUser(req);
  if (!user?.id) {
    return { user: null, role: null, isAdmin: false, mustChangePassword: false };
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
    isAdmin: user.is_admin,
    mustChangePassword: user.must_change_password,
  };
}

export function isAdminRole(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin";
}
