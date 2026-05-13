import type { WorkspaceRole } from "@/lib/workspaceStore";

export function roleCanReadPrompt(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin" || role === "editor" || role === "viewer";
}

export function roleCanEditPrompt(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}
