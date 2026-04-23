"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PromptDto } from "@/lib/promptDto";

const PAGE_SIZE = 8;

export default function PromptsPage() {
  const [items, setItems] = useState<PromptDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt" | "title">("updatedAt");
  const [page, setPage] = useState(1);

  const loadPrompts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category.trim()) params.set("category", category.trim());
      if (tag.trim()) params.set("tag", tag.trim());
      params.set("limit", "100");
      const res = await fetch(`/api/prompts?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error || "Не удалось загрузить список");
      }
      const data = (await res.json()) as PromptDto[];
      setItems(data);
      setPage(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [query, category, tag]);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

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

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.category).filter(Boolean))) as string[];
  }, [items]);

  const sortedItems = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title, "ru");
      if (sortBy === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return copy;
  }, [items, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const paginatedItems = sortedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Каталог промптов</h1>
        <div className="flex gap-2">
          <Link href="/" className="rounded-xl border px-3 py-2 text-sm">
            ← Конструктор
          </Link>
          <Link href="/prompts/new" className="rounded-xl bg-black px-3 py-2 text-sm text-white">
            + Новый промпт
          </Link>
        </div>
      </div>

      <section className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" placeholder="Поиск по тексту" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
          <option value="">Все категории</option>
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <input value={tag} onChange={(e) => setTag(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" placeholder="Тег (например: marketing)" />
        <div className="flex gap-2">
          <button onClick={loadPrompts} className="rounded-xl bg-black px-3 py-2 text-sm text-white">Применить</button>
          <button
            onClick={() => {
              setQuery("");
              setCategory("");
              setTag("");
              setSortBy("updatedAt");
              void loadPrompts();
            }}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            Сброс
          </button>
        </div>
      </section>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Найдено: {sortedItems.length}</span>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "updatedAt" | "createdAt" | "title")} className="rounded-xl border px-2 py-1">
          <option value="updatedAt">Сортировка: обновлённые</option>
          <option value="createdAt">Сортировка: созданные</option>
          <option value="title">Сортировка: по названию</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-500">Загрузка…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !sortedItems.length && (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
          Пока нет сохранённых промптов.
        </div>
      )}

      <div className="space-y-3">
        {paginatedItems.map((item) => (
          <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <Link href={`/prompts/${item.id}`} className="text-lg font-medium hover:underline">
                  {item.title}
                </Link>
                <p className="text-xs text-gray-500">Обновлён: {new Date(item.updatedAt).toLocaleString("ru-RU")}</p>
              </div>
              <button onClick={() => onDelete(item.id)} className="rounded-lg border px-2 py-1 text-xs text-red-600">
                Удалить
              </button>
            </div>
            {item.category ? <p className="mb-2 text-xs text-gray-500">Категория: {item.category}</p> : null}
            {item.tags.length > 0 ? <p className="mb-2 text-xs text-gray-500">Теги: {item.tags.join(", ")}</p> : null}
            <p className="line-clamp-3 text-sm text-gray-700">{item.prompt}</p>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 text-sm">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border px-3 py-1 disabled:opacity-50">Назад</button>
        <span>{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border px-3 py-1 disabled:opacity-50">Вперёд</button>
      </div>
    </main>
  );
}
