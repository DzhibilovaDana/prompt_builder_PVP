"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PromptRecord } from "@/lib/promptStore";

export default function PromptsPage() {
  const [items, setItems] = useState<PromptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/prompts", { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось загрузить список");
      const data = (await res.json()) as PromptRecord[];
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPrompts();
  }, []);

  const onDelete = async (id: number) => {
    const ok = window.confirm("Удалить промпт?");
    if (!ok) return;

    try {
      const res = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить");
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Сохранённые промпты</h1>
        <div className="flex gap-2">
          <Link href="/" className="rounded-xl border px-3 py-2 text-sm">
            ← Конструктор
          </Link>
          <Link href="/prompts/new" className="rounded-xl bg-black px-3 py-2 text-sm text-white">
            + Новый промпт
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Загрузка…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !items.length && (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
          Пока нет сохранённых промптов. Создайте первый на странице «Новый промпт».
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <Link href={`/prompts/${item.id}`} className="text-lg font-medium hover:underline">
                  {item.title}
                </Link>
                <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString("ru-RU")}</p>
              </div>
              <button onClick={() => onDelete(item.id)} className="rounded-lg border px-2 py-1 text-xs text-red-600">
                Удалить
              </button>
            </div>
            <p className="line-clamp-3 text-sm text-gray-700">{item.content}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
