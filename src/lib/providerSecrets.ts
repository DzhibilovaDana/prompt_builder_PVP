import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type ProviderSecrets = {
  openaiApiKey?: string;
  deepseekApiKey?: string;
  yandexApiKey?: string;
  yandexFolderId?: string;
  yandexModelUri?: string;
  anthropicApiKey?: string;
};

const localSecretsPath = path.join(process.cwd(), "config", "llm-keys.local.json");

function readLocalSecrets(): ProviderSecrets {
  if (!existsSync(localSecretsPath)) {
    return {};
  }

  try {
    const raw = readFileSync(localSecretsPath, "utf8");
    const parsed = JSON.parse(raw) as ProviderSecrets;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function resolveProviderSecrets(): ProviderSecrets {
  const local = readLocalSecrets();

  return {
    openaiApiKey: local.openaiApiKey || process.env.OPENAI_API_KEY,
    deepseekApiKey: local.deepseekApiKey || process.env.DEEPSEEK_API_KEY,
    yandexApiKey: local.yandexApiKey || process.env.YANDEX_API_KEY,
    yandexFolderId: local.yandexFolderId || process.env.YANDEX_FOLDER_ID,
    yandexModelUri: local.yandexModelUri || process.env.YANDEX_MODEL_URI,
    anthropicApiKey: local.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
  };
}
