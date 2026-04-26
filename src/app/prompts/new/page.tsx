"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CreatePromptResponse = {
  id: number;
};

export default function NewPromptPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [metadata, setMetadata] = useState('{"purpose":"","topic":""}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      let metadataJson: Record<string, unknown> = {};
      if (metadata.trim()) {
        metadataJson = JSON.parse(metadata) as Record<string, unknown>;
      }

      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, tags, metadata: metadataJson }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Ошибка создания");
      }

      const created = (await res.json()) as CreatePromptResponse;
      router.push(`/prompts/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Новый промпт</h1>
        <Link href="/prompts" className="rounded-xl border px-3 py-2 text-sm">
          ← К списку
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <label className="text-sm font-medium">Название</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="Например: План релиза MVP" required />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Категория</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="Например: Маркетинг" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Теги (через запятую)</label>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="seo, b2b, launch" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Содержимое промпта</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-40 w-full rounded-xl border px-3 py-2" placeholder="Вставьте текст промпта..." required />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Metadata (JSON)</label>
          <textarea value={metadata} onChange={(e) => setMetadata(e.target.value)} className="min-h-24 w-full rounded-xl border px-3 py-2 font-mono text-xs" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button disabled={saving} className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60">
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </form>
    </main>
  );
}
