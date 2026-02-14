import { NextResponse } from "next/server";

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { prompt?: unknown; model?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" && body.model.trim() ? body.model : "gpt-4.1-mini";

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        mode: "mock",
        model,
        output: mockGenerate(prompt),
      });
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
      return NextResponse.json({ error: `OpenAI error: ${text}` }, { status: 502 });
    }

    const data = (await res.json()) as { output_text?: unknown };
    const output = typeof data.output_text === "string" ? data.output_text : JSON.stringify(data);

    return NextResponse.json({
      mode: "openai",
      model,
      output,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Generate error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
