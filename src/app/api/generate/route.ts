// src/app/api/generate/route.ts
import { NextResponse } from "next/server";
import { generateWithProviders } from "@/lib/inference";
import { sanitizeProviderSecrets } from "@/lib/providerSecrets";
import { createPromptRun } from "@/lib/promptStore";
import { getRequestUser } from "@/lib/auth";
import { hasSuspiciousPayload } from "@/lib/security";

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

  try {
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
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `OpenAI error: ${text}`, status: 502 };
    }

    const data = (await res.json()) as OpenAIResponse;
    const output = typeof data.output_text === "string" ? data.output_text : JSON.stringify(data);
    return { mode: "openai", model, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `OpenAI network error: ${message}`, status: 502 };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (hasSuspiciousPayload(body)) {
      const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const ip = forwardedFor || req.headers.get("x-real-ip") || "unknown";
      const userAgent = req.headers.get("user-agent") || "unknown";

      console.warn(
        JSON.stringify({
          type: "security_event",
          reason: "suspicious_payload_blocked",
          status: 400,
          method: "POST",
          path: "/api/generate",
          ip,
          userAgent,
          timestamp: new Date().toISOString(),
        })
      );

      return NextResponse.json({ error: "suspicious payload blocked" }, { status: 400 });
    }
    const promptId = typeof body.promptId === "number" && Number.isInteger(body.promptId) ? body.promptId : null;
    const workspaceId = typeof body.workspaceId === "number" && Number.isInteger(body.workspaceId) ? body.workspaceId : null;
    const user = await getRequestUser(req);

    const configuredApiToken = process.env.PB_API_TOKEN?.trim();
    const headerToken = req.headers.get("x-api-token")?.trim();
    const hasValidApiToken = Boolean(configuredApiToken && headerToken && headerToken === configuredApiToken);

    if (!hasValidApiToken && !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (Array.isArray(body.providers)) {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      const providers = body.providers.filter((p): p is string => typeof p === "string");
      const providerKeys = sanitizeProviderSecrets(body.providerKeys);

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

      const results = await generateWithProviders(providers, prompt, providerKeys);
      await Promise.all(
        Object.entries(results).map(([provider, result]) =>
          createPromptRun({
            promptId,
            userId: user?.id ?? null,
            workspaceId,
            provider,
            model: result.model ?? null,
            status: result.status,
            latencyMs: result.timeMs ?? null,
            promptChars: prompt.length,
            outputChars: result.output?.length ?? 0,
            error: result.error ?? null,
          })
        )
      );

      return NextResponse.json({ mode: "ok", results, source: "request.providerKeys/env/local-file" });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" && body.model.trim() ? body.model : "gpt-4.1-mini";

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const startedAt = Date.now();
    const single = await handleSingleModel(prompt, model);
    if (isSingleModelError(single)) {
      await createPromptRun({
        promptId,
        userId: user?.id ?? null,
        workspaceId,
        provider: "openai",
        model,
        status: "error",
        latencyMs: Date.now() - startedAt,
        promptChars: prompt.length,
        outputChars: 0,
        error: single.error,
      });
      return NextResponse.json({ error: single.error }, { status: single.status });
    }

    await createPromptRun({
      promptId,
      userId: user?.id ?? null,
      workspaceId,
      provider: single.mode === "mock" ? "local" : "openai",
      model: single.model,
      status: "ok",
      latencyMs: Date.now() - startedAt,
      promptChars: prompt.length,
      outputChars: single.output.length,
      error: null,
    });

    return NextResponse.json(single);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Generate error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
