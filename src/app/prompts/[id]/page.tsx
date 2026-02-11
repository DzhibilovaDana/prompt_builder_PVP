"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { PromptRecord } from "@/lib/promptStore";

type GenerateResponse = {
  output?: string;
  error?: string;
  mode?: string;
  model?: string;
};

export default function PromptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [prompt, setPrompt] = useState<PromptRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string>("");
  const [meta, setMeta] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/prompts/${id}`, { cache: "no-store" });
        const data = (await res.json()) as PromptRecord | { error?: string };
        if (!res.ok) throw new Error("error" in data ? data.error : "Не найдено");
        setPrompt(data as PromptRecord);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void load();
    }
  }, [id]);

  const onGenerate = async () => {
    if (!prompt) return;
    try {
      setGenerating(true);
      setResult("");
      setMeta("");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.content }),
      });
      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) throw new Error(data.error || "Ошибка генерации");
      setResult(data.output || "(пустой ответ)");
      setMeta(`${data.mode || "unknown"} · ${data.model || "default"}`);
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : "Ошибка генерации");
      setMeta("error");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-6 text-sm text-gray-500">Загрузка…</main>;
  if (error || !prompt) return <main className="mx-auto max-w-4xl px-4 py-6 text-sm text-red-600">{error || "Не найдено"}</main>;

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{prompt.title}</h1>
        <div className="flex gap-2">
          <Link href="/prompts" className="rounded-xl border px-3 py-2 text-sm">
            ← К списку
          </Link>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {generating ? "Генерация…" : "Сгенерировать ответ"}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Промпт</h2>
        <pre className="whitespace-pre-wrap text-sm text-gray-800">{prompt.content}</pre>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Результат генерации</h2>
          {meta && <span className="text-xs text-gray-500">{meta}</span>}
        </div>
        <pre className="min-h-24 whitespace-pre-wrap text-sm text-gray-800">
          {result || "Нажмите «Сгенерировать ответ», чтобы получить результат."}
        </pre>
      </section>
    </main>
  );
}
