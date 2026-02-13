// src/app/api/generate/route.ts
import { NextResponse } from "next/server";
import { generateWithProviders, ProviderResult } from "@/lib/inference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mockGenerate(prompt: string): string {
  return [
    "[MOCK LLM RESPONSE]",
    "",
    "Ваш промпт принят. Ниже пример структурированного ответа:",
    "1) Краткое резюме",
    "2) Ключевые тезисы",
    "3) Рекомендованные следующие шаги",
    "",
    `Исходный prompt (фрагмент): ${prompt.slice(0, 200)}${prompt.length > 200 ? "…" : ""}`,
  ].join("\n");
}

/**
 * Возвращаем результат для одного OpenAI-подхода,
 * оставляя существующую логику (model -> OpenAI, or mock if no key).
 */
async function handleSingleModel(prompt: string, model: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Если ключа нет — возвращаем mock
    return { mode: "mock", model, output: mockGenerate(prompt) };
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `OpenAI error: ${text}`, status: 502 };
  }

  const data = (await res.json()) as any;
  // старая логика ожидала output_text; если его нет - сериализуем весь ответ
  const output = typeof data.output_text === "string" ? data.output_text : JSON.stringify(data);
  return { mode: "openai", model, output };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // If client asks for providers array -> multi-provider mode
    if (Array.isArray(body.providers)) {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      const providers = body.providers.filter((p) => typeof p === "string") as string[];

      if (!prompt) {
        return NextResponse.json({ error: "prompt required" }, { status: 400 });
      }

      // If providers array empty -> degraded response
      if (providers.length === 0) {
        return NextResponse.json({
          mode: "degraded",
          message: "No providers requested — generation unavailable. Returning prompt only.",
          results: {},
        });
      }

      // call inference adapters (may be mock)
      const results = await generateWithProviders(providers, prompt);
      // results: Record<provider, ProviderResult>
      return NextResponse.json({ mode: "ok", results });
    }

    // Otherwise keep compatibility: single-model flow (existing behavior)
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" && body.model.trim() ? body.model : "gpt-4.1-mini";

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const single = await handleSingleModel(prompt, model);
    if ((single as any).error) {
      return NextResponse.json({ error: (single as any).error }, { status: (single as any).status ?? 502 });
    }

    // Return same shape as before for backward compatibility
    return NextResponse.json(single);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Generate error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
