import { promises as fs } from "fs";
import path from "path";

export type PromptRecord = {
  id: number;
  title: string;
  content: string;
  created_at: string;
};

type PromptStore = {
  prompts: PromptRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "prompts.json");

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    const initial: PromptStore = { prompts: [] };
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
}

async function readStore(): Promise<PromptStore> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Partial<PromptStore>;
  return {
    prompts: Array.isArray(parsed.prompts) ? parsed.prompts : [],
  };
}

async function writeStore(store: PromptStore): Promise<void> {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export async function listPrompts(): Promise<PromptRecord[]> {
  const store = await readStore();
  return [...store.prompts].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function getPromptById(id: number): Promise<PromptRecord | null> {
  const store = await readStore();
  return store.prompts.find((p) => p.id === id) ?? null;
}

export async function createPrompt(title: string, content: string): Promise<PromptRecord> {
  const store = await readStore();
  const maxId = store.prompts.reduce((acc, item) => Math.max(acc, item.id), 0);
  const next: PromptRecord = {
    id: maxId + 1,
    title,
    content,
    created_at: new Date().toISOString(),
  };
  store.prompts.push(next);
  await writeStore(store);
  return next;
}

export async function deletePrompt(id: number): Promise<boolean> {
  const store = await readStore();
  const next = store.prompts.filter((p) => p.id !== id);
  if (next.length === store.prompts.length) return false;
  await writeStore({ prompts: next });
  return true;
}
