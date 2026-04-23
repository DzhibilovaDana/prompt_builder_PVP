export type PromptDto = {
  id: number;
  workspaceId: number | null;
  title: string;
  prompt: string;
  category: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PromptVersionDto = {
  id: number;
  prompt_id: number;
  version_no: number;
  title: string;
  content: string;
  author_user_id: number | null;
  created_at: string;
};