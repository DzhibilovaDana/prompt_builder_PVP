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

function cleanSecret(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function sanitizeProviderSecrets(value: unknown): ProviderSecrets {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    openaiApiKey: cleanSecret(source.openaiApiKey),
    deepseekApiKey: cleanSecret(source.deepseekApiKey),
    yandexApiKey: cleanSecret(source.yandexApiKey),
    yandexFolderId: cleanSecret(source.yandexFolderId),
    yandexModelUri: cleanSecret(source.yandexModelUri),
    anthropicApiKey: cleanSecret(source.anthropicApiKey),
  };
}

export function resolveProviderSecrets(overrides?: ProviderSecrets): ProviderSecrets {
  const local = readLocalSecrets();
  const safeOverrides = sanitizeProviderSecrets(overrides);

  return {
    openaiApiKey: safeOverrides.openaiApiKey || local.openaiApiKey || process.env.OPENAI_API_KEY,
    deepseekApiKey: safeOverrides.deepseekApiKey || local.deepseekApiKey || process.env.DEEPSEEK_API_KEY,
    yandexApiKey: safeOverrides.yandexApiKey || local.yandexApiKey || process.env.YANDEX_API_KEY,
    yandexFolderId: safeOverrides.yandexFolderId || local.yandexFolderId || process.env.YANDEX_FOLDER_ID,
    yandexModelUri: safeOverrides.yandexModelUri || local.yandexModelUri || process.env.YANDEX_MODEL_URI,
    anthropicApiKey: safeOverrides.anthropicApiKey || local.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
  };
}
