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

function normalizeSecret(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function sanitizeProviderSecrets(value: unknown): ProviderSecrets {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  return {
    openaiApiKey: normalizeSecret(candidate.openaiApiKey),
    deepseekApiKey: normalizeSecret(candidate.deepseekApiKey),
    yandexApiKey: normalizeSecret(candidate.yandexApiKey),
    yandexFolderId: normalizeSecret(candidate.yandexFolderId),
    yandexModelUri: normalizeSecret(candidate.yandexModelUri),
    anthropicApiKey: normalizeSecret(candidate.anthropicApiKey),
  };
}

export function resolveProviderSecrets(overrideSecrets?: ProviderSecrets): ProviderSecrets {
  const local = readLocalSecrets();
  const override = sanitizeProviderSecrets(overrideSecrets);

  return {
    openaiApiKey: override.openaiApiKey || local.openaiApiKey || process.env.OPENAI_API_KEY,
    deepseekApiKey: override.deepseekApiKey || local.deepseekApiKey || process.env.DEEPSEEK_API_KEY,
    yandexApiKey: override.yandexApiKey || local.yandexApiKey || process.env.YANDEX_API_KEY,
    yandexFolderId: override.yandexFolderId || local.yandexFolderId || process.env.YANDEX_FOLDER_ID,
    yandexModelUri: override.yandexModelUri || local.yandexModelUri || process.env.YANDEX_MODEL_URI,
    anthropicApiKey: override.anthropicApiKey || local.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
  };
}
