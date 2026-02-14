// src/lib/inference.ts
/**
 * Простая mock-реализация InferenceAdapter'ов для MVP.
 * - Поддерживаем провайдеры: 'openai', 'claude', 'local'
 * - Возвращаем { status, output?, error?, model?, timeMs }
 *
 * В продакшне здесь подключите реальные SDK (openai/anthropic и т.д.)
 */

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function callOpenAI(prompt: string): Promise<ProviderResult> {
  const t0 = Date.now();
  await sleep(700); // simulate latency
  const summary = prompt.length > 180 ? prompt.slice(0, 180) + "…" : prompt;
  return {
    status: "ok",
    output: `OpenAI (gpt-4o) — mock answer for prompt:\n${summary}`,
    model: "gpt-4o",
    timeMs: Date.now() - t0,
  };
}

async function callClaude(prompt: string): Promise<ProviderResult> {
  const t0 = Date.now();
  await sleep(1100);
  const summary = prompt.length > 200 ? prompt.slice(0, 200) + "…" : prompt;
  return {
    status: "ok",
    output: `Anthropic Claude — mock answer for prompt:\n${summary}`,
    model: "claude-3.5",
    timeMs: Date.now() - t0,
  };
}

async function callLocal(prompt: string): Promise<ProviderResult> {
  const t0 = Date.now();
  await sleep(1200);
  const fail = Math.random() < 0.3;
  if (fail) {
    return {
      status: "error",
      error: "Local model crashed / OOM (simulated)",
      model: "local-llm",
      timeMs: Date.now() - t0,
    };
  }
  const summary = prompt.length > 160 ? prompt.slice(0, 160) + "…" : prompt;
  return {
    status: "ok",
    output: `Local LLM — mock answer for prompt:\n${summary}`,
    model: "local-llm",
    timeMs: Date.now() - t0,
  };
}

export type ProviderResult = {
  status: "ok" | "error" | "pending";
  output?: string;
  error?: string;
  model?: string;
  timeMs?: number;
};

export async function generateWithProviders(providers: string[], prompt: string): Promise<Record<string, ProviderResult>> {
  const calls = providers.map(async (p) => {
    if (p === "openai") {
      return { provider: p, result: await callOpenAI(prompt) } as const;
    }
    if (p === "claude") {
      return { provider: p, result: await callClaude(prompt) } as const;
    }
    if (p === "local") {
      return { provider: p, result: await callLocal(prompt) } as const;
    }
    // fallback for unknown provider
    return {
      provider: p,
      result: {
        status: "error",
        error: `Unknown provider "${p}"`,
        model: "unknown",
        timeMs: 0,
      } as ProviderResult,
    } as const;
  });

  const settled = await Promise.all(calls);
  const map: Record<string, ProviderResult> = {};
  for (const s of settled) {
    map[s.provider] = s.result;
  }
  return map;
}
