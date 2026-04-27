// src/lib/inference.ts
import { type ProviderSecrets, resolveProviderSecrets } from "@/lib/providerSecrets";

export type ProviderResult = {
  status: "ok" | "error" | "pending";
  output?: string;
  error?: string;
  model?: string;
  timeMs?: number;
};

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_CLAUDE_MODEL = "claude-3-5-sonnet-latest";
const DEFAULT_YANDEX_MODEL_URI = "gpt://<folder-id>/yandexgpt-lite/latest";
const PROVIDER_TIMEOUT_MS = 15000;

function normalizeText(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return JSON.stringify(value);
}

async function callOpenAI(prompt: string, secrets: ProviderSecrets): Promise<ProviderResult> {
  const t0 = Date.now();
  const { openaiApiKey } = secrets;

  if (!openaiApiKey) {
    return {
      status: "error",
      error: "OPENAI_API_KEY (or openaiApiKey in config/llm-keys.local.json) is missing",
      model: DEFAULT_OPENAI_MODEL,
      timeMs: Date.now() - t0,
    };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({ model: DEFAULT_OPENAI_MODEL, input: prompt }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!res.ok) {
      return {
        status: "error",
        error: `OpenAI error: ${await res.text()}`,
        model: DEFAULT_OPENAI_MODEL,
        timeMs: Date.now() - t0,
      };
    }

    const data = (await res.json()) as { output_text?: unknown };
    return {
      status: "ok",
      output: normalizeText(data.output_text ?? data),
      model: DEFAULT_OPENAI_MODEL,
      timeMs: Date.now() - t0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      error: `OpenAI network error: ${message}`,
      model: DEFAULT_OPENAI_MODEL,
      timeMs: Date.now() - t0,
    };
  }
}

async function callDeepSeek(prompt: string, secrets: ProviderSecrets): Promise<ProviderResult> {
  const t0 = Date.now();
  const { deepseekApiKey } = secrets;

  if (!deepseekApiKey) {
    return {
      status: "error",
      error: "DEEPSEEK_API_KEY (or deepseekApiKey in config/llm-keys.local.json) is missing",
      model: DEFAULT_DEEPSEEK_MODEL,
      timeMs: Date.now() - t0,
    };
  }

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_DEEPSEEK_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!res.ok) {
      return {
        status: "error",
        error: `DeepSeek error: ${await res.text()}`,
        model: DEFAULT_DEEPSEEK_MODEL,
        timeMs: Date.now() - t0,
      };
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
    const output = data.choices?.[0]?.message?.content;

    return {
      status: "ok",
      output: normalizeText(output ?? data),
      model: DEFAULT_DEEPSEEK_MODEL,
      timeMs: Date.now() - t0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      error: `DeepSeek network error: ${message}`,
      model: DEFAULT_DEEPSEEK_MODEL,
      timeMs: Date.now() - t0,
    };
  }
}

async function callYandexGPT(prompt: string, secrets: ProviderSecrets): Promise<ProviderResult> {
  const t0 = Date.now();
  const { yandexApiKey, yandexFolderId, yandexModelUri } = secrets;

  if (!yandexApiKey) {
    return {
      status: "error",
      error: "YANDEX_API_KEY (or yandexApiKey in config/llm-keys.local.json) is missing",
      model: "yandexgpt-lite",
      timeMs: Date.now() - t0,
    };
  }

  const modelUri = yandexModelUri || (yandexFolderId ? `gpt://${yandexFolderId}/yandexgpt-lite/latest` : DEFAULT_YANDEX_MODEL_URI);

  try {
    const res = await fetch("https://llm.api.cloud.yandex.net/foundationModels/v1/completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${yandexApiKey}`,
      },
      body: JSON.stringify({
        modelUri,
        completionOptions: {
          stream: false,
          temperature: 0.2,
          maxTokens: "2000",
        },
        messages: [{ role: "user", text: prompt }],
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!res.ok) {
      return {
        status: "error",
        error: `YandexGPT error: ${await res.text()}`,
        model: modelUri,
        timeMs: Date.now() - t0,
      };
    }

    const data = (await res.json()) as {
      result?: { alternatives?: Array<{ message?: { text?: unknown } }> };
    };

    const output = data.result?.alternatives?.[0]?.message?.text;

    return {
      status: "ok",
      output: normalizeText(output ?? data),
      model: modelUri,
      timeMs: Date.now() - t0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      error: `YandexGPT network error: ${message}`,
      model: modelUri,
      timeMs: Date.now() - t0,
    };
  }
}

async function callClaude(prompt: string, secrets: ProviderSecrets): Promise<ProviderResult> {
  const t0 = Date.now();
  const { anthropicApiKey } = secrets;

  if (!anthropicApiKey) {
    return {
      status: "error",
      error: "ANTHROPIC_API_KEY (or anthropicApiKey in config/llm-keys.local.json) is missing",
      model: DEFAULT_CLAUDE_MODEL,
      timeMs: Date.now() - t0,
    };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!res.ok) {
      return {
        status: "error",
        error: `Claude error: ${await res.text()}`,
        model: DEFAULT_CLAUDE_MODEL,
        timeMs: Date.now() - t0,
      };
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: unknown }>;
    };

    const output = data.content?.find((part) => part.type === "text")?.text;

    return {
      status: "ok",
      output: normalizeText(output ?? data),
      model: DEFAULT_CLAUDE_MODEL,
      timeMs: Date.now() - t0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "error",
      error: `Claude network error: ${message}`,
      model: DEFAULT_CLAUDE_MODEL,
      timeMs: Date.now() - t0,
    };
  }
}

export function getProvidersHealth(providerKeys?: ProviderSecrets): Record<string, { status: "ok" | "error"; configured: boolean; model: string }> {
  const secrets = resolveProviderSecrets(providerKeys);

  return {
    openai: { status: secrets.openaiApiKey ? "ok" : "error", configured: Boolean(secrets.openaiApiKey), model: DEFAULT_OPENAI_MODEL },
    deepseek: { status: secrets.deepseekApiKey ? "ok" : "error", configured: Boolean(secrets.deepseekApiKey), model: DEFAULT_DEEPSEEK_MODEL },
    yandex: { status: secrets.yandexApiKey ? "ok" : "error", configured: Boolean(secrets.yandexApiKey), model: secrets.yandexModelUri || "yandexgpt-lite" },
    claude: { status: secrets.anthropicApiKey ? "ok" : "error", configured: Boolean(secrets.anthropicApiKey), model: DEFAULT_CLAUDE_MODEL },
  };
}

export async function generateWithProviders(
  providers: string[],
  prompt: string,
  providerKeys?: ProviderSecrets
): Promise<Record<string, ProviderResult>> {
  const secrets = resolveProviderSecrets(providerKeys);
  const calls = providers.map(async (providerName) => {
    const provider = providerName.toLowerCase();

    if (provider === "openai" || provider === "chatgpt") {
      return { provider: providerName, result: await callOpenAI(prompt, secrets) } as const;
    }

    if (provider === "deepseek") {
      return { provider: providerName, result: await callDeepSeek(prompt, secrets) } as const;
    }

    if (provider === "yandex" || provider === "yandexgpt") {
      return { provider: providerName, result: await callYandexGPT(prompt, secrets) } as const;
    }

    if (provider === "claude" || provider === "anthropic") {
      return { provider: providerName, result: await callClaude(prompt, secrets) } as const;
    }

    return {
      provider: providerName,
      result: {
        status: "error",
        error: `Unknown provider "${providerName}"`,
        model: "unknown",
        timeMs: 0,
      } as ProviderResult,
    } as const;
  });

  const settled = await Promise.all(calls);
  const map: Record<string, ProviderResult> = {};

  for (const item of settled) {
    map[item.provider] = item.result;
  }

  return map;
}
