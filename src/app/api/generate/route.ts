// src/app/api/generate/route.ts
import { NextResponse } from "next/server";
import { generateWithProviders } from "@/lib/inference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OpenAIResponse = {
  output_text?: string;
};

type SingleModelSuccess = {
  mode: "mock" | "openai";
  model: string;
  output: string;
};

type SingleModelError = {
  error: string;
  status: number;
};

function isSingleModelError(value: SingleModelSuccess | SingleModelError): value is SingleModelError {
  return "error" in value;
}

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

async function handleSingleModel(prompt: string, model: string): Promise<SingleModelSuccess | SingleModelError> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
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

  const data = (await res.json()) as OpenAIResponse;
  const output = typeof data.output_text === "string" ? data.output_text : JSON.stringify(data);
  return { mode: "openai", model, output };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (Array.isArray(body.providers)) {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      const providers = body.providers.filter((p): p is string => typeof p === "string");

      if (!prompt) {
        return NextResponse.json({ error: "prompt required" }, { status: 400 });
      }

      if (providers.length === 0) {
        return NextResponse.json({
          mode: "degraded",
          message: "No providers requested — generation unavailable. Returning prompt only.",
          results: {},
        });
      }

      const results = await generateWithProviders(providers, prompt);
      return NextResponse.json({ mode: "ok", results });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" && body.model.trim() ? body.model : "gpt-4.1-mini";

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const single = await handleSingleModel(prompt, model);
    if (isSingleModelError(single)) {
      return NextResponse.json({ error: single.error }, { status: single.status });
    }

    return NextResponse.json(single);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Generate error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
