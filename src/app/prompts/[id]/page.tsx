"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { exportPromptAsHtml, exportPromptAsMarkdown } from "@/lib/exportPrompt";
import type { PromptDto, PromptVersionDto } from "@/lib/promptDto";

type GenerateResponse = {
  output?: string;
  error?: string;
  mode?: string;
  model?: string;
};

export default function PromptDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [prompt, setPrompt] = useState<PromptDto | null>(null);
  const [versions, setVersions] = useState<PromptVersionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const [result, setResult] = useState<string>("");
  const [meta, setMeta] = useState<string>("");
  const loadPrompt = useCallback(async () => {
    const res = await fetch(`/api/prompts/${id}`, { cache: "no-store" });
    const data = (await res.json()) as PromptDto | { error?: string };
    if (!res.ok) throw new Error("error" in data ? data.error : "Не найдено");
    setPrompt(data as PromptDto);
  }, [id]);

    const loadVersions = useCallback(async () => {
    const res = await fetch(`/api/prompts/${id}/versions`, { cache: "no-store" });
    if (!res.ok) {
      setVersions([]);
      return;
    }
   const data = (await res.json()) as { versions?: PromptVersionDto[] };
    setVersions(data.versions || []);
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([loadPrompt(), loadVersions()]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void load();
    }
  }, [id, loadPrompt, loadVersions]);

  const onGenerate = async () => {
    if (!prompt) return;
    try {
      setGenerating(true);
      setResult("");
      setMeta("");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.prompt }),
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

  const rollback = async (versionNo: number) => {
    try {
      setRollingBack(versionNo);
      const res = await fetch(`/api/prompts/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNo }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Не удалось откатить");
      }
      await Promise.all([loadPrompt(), loadVersions()]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось откатить версию");
    } finally {
      setRollingBack(null);
    }
  };

  const exportTxt = () => {
    if (!prompt?.prompt) return;
    const blob = new Blob([prompt.prompt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-${prompt.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const latestVersions = useMemo(() => versions.slice(0, 10), [versions]);

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-6 text-sm text-gray-500">Загрузка…</main>;
  if (error || !prompt) return <main className="mx-auto max-w-4xl px-4 py-6 text-sm text-red-600">{error || "Не найдено"}</main>;

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{prompt.title}</h1>
        <div className="flex gap-2">
          <Link href="/prompts" className="rounded-xl border px-3 py-2 text-sm">← К списку</Link>
          <button onClick={onGenerate} disabled={generating} className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-60">
            {generating ? "Генерация…" : "Сгенерировать"}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Промпт</h2>
          <div className="flex gap-2 text-xs">
            <button onClick={exportTxt} className="rounded-lg border px-2 py-1">Экспорт .txt</button>
            <button onClick={() => exportPromptAsMarkdown(prompt.prompt)} className="rounded-lg border px-2 py-1">Экспорт .md</button>
            <button onClick={() => exportPromptAsHtml(prompt.prompt)} className="rounded-lg border px-2 py-1">Экспорт .html</button>
          </div>
        </div>
        <p className="mb-2 text-xs text-gray-500">Категория: {prompt.category || "—"}</p>
        <p className="mb-2 text-xs text-gray-500">Теги: {prompt.tags.join(", ") || "—"}</p>
        <pre className="whitespace-pre-wrap text-sm text-gray-800">{prompt.prompt}</pre>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Результат генерации</h2>
          {meta && <span className="text-xs text-gray-500">{meta}</span>}
        </div>
        <pre className="min-h-24 whitespace-pre-wrap text-sm text-gray-800">{result || "Нажмите «Сгенерировать», чтобы получить результат."}</pre>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">История версий</h2>
        {!latestVersions.length ? (
          <p className="text-sm text-gray-500">Версии пока не найдены.</p>
        ) : (
          <div className="space-y-2">
            {latestVersions.map((version) => (
              <div key={version.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <div>
                  <p>v{version.version_no} · {new Date(version.created_at).toLocaleString("ru-RU")}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{version.title}</p>
                </div>
                <button
                  onClick={() => rollback(version.version_no)}
                  disabled={rollingBack === version.version_no}
                  className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                >
                  {rollingBack === version.version_no ? "Откат..." : "Откатить"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
