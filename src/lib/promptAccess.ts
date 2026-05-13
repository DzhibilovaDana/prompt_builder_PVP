import type { PromptRecord } from "@/lib/promptStore";
import { getWorkspaceRoleForUser } from "@/lib/workspaceStore";
import { roleCanEditPrompt, roleCanReadPrompt } from "@/lib/promptAccessRules";

export async function canReadPromptByUser(prompt: PromptRecord, userId: number): Promise<boolean> {
  if (prompt.workspace_id) {
    const role = await getWorkspaceRoleForUser(prompt.workspace_id, userId);
    return roleCanReadPrompt(role);
  }
  return Number(prompt.user_id) === Number(userId);
}

export async function canEditPromptByUser(prompt: PromptRecord, userId: number): Promise<boolean> {
  if (prompt.workspace_id) {
    const role = await getWorkspaceRoleForUser(prompt.workspace_id, userId);
    return roleCanEditPrompt(role);
  }
  return Number(prompt.user_id) === Number(userId);
}
