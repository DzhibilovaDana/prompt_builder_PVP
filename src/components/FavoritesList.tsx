// src/components/FavoritesList.tsx
import React, { useRef } from "react";
import type { FavoritePrompt } from "@/hooks/useFavorites";

interface FavoritesListProps {
  favorites: FavoritePrompt[];
  onUseFavorite: (prompt: string) => void;
  onDeleteFavorite: (id: string) => void;
  // import handler: accepts array of parsed prompts {title,prompt}
  onImportFavorites?: (items: { title: string; prompt: string }[]) => Promise<void> | void;
  // new: share handler (parent должен обеспечивать сохранение на сервер и копирование ссылки)
  onShareFavorite?: (fav: FavoritePrompt) => Promise<void> | void;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toImportedFavorite(value: unknown): { title: string; prompt: string } | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.prompt !== "string") return null;
  return {
    title: typeof candidate.title === "string" && candidate.title ? candidate.title : "Промпт без названия",
    prompt: candidate.prompt,
  };
}

function downloadFile(filename: string, content: string, mimeType = "application/json;charset=utf-8") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function makeFilename(ext: string): string {
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, "-");
  return `prompts-${iso}.${ext}`;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  favorites,
  onUseFavorite,
  onDeleteFavorite,
  onImportFavorites,
  onShareFavorite,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportAll = () => {
    const content = JSON.stringify(favorites, null, 2);
    downloadFile(makeFilename("json"), content);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      // Expect an array of objects with {title, prompt}
      let items: { title: string; prompt: string }[] = [];
      if (Array.isArray(parsed)) {
        items = parsed.map((p: unknown) => toImportedFavorite(p)).filter((item): item is { title: string; prompt: string } => item !== null);
      } else {
        const single = toImportedFavorite(parsed);
        if (!single) {
          alert("Неподдерживаемый формат файла. Ожидается JSON-массив объектов {title, prompt}.");
          return;
        }
        items = [single];
      }

      if (items.length === 0) {
        alert("Файл не содержит корректных промптов.");
        return;
      }

      if (onImportFavorites) {
        await onImportFavorites(items);
      } else {
        // если нет обработчика — просто скачиваем обратно как safety
        alert(`Импортировано ${items.length} промптов (локально)`);
      }
    } catch (err: unknown) {
      alert("Ошибка при импортировании файла: " + getErrorMessage(err));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleShare = async (fav: FavoritePrompt) => {
    // If parent provided a handler — delegate to it (recommended)
    if (onShareFavorite) {
      try {
        await onShareFavorite(fav);
      } catch (err: unknown) {
        alert("Ошибка при попытке поделиться промптом: " + getErrorMessage(err));
      }
      return;
    }

    // Fallback: try to copy server URL (best-effort)
    try {
      const url = `${location.origin}/api/prompts/${encodeURIComponent(fav.id)}`;
      await navigator.clipboard.writeText(url);
      alert("Ссылка скопирована в буфер обмена:\n" + url);
    } catch {
      alert("Не удалось скопировать ссылку. Вот ссылка:\n" + `${location.origin}/api/prompts/${encodeURIComponent(fav.id)}`);
    }
  };

  if (!favorites.length) {
    return (
      <section id="favorites-section" className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Избранное</h3>
          <div className="flex gap-2">
            <button onClick={handleExportAll} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
              Экспорт
            </button>
            <button onClick={handleImportClick} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
              Импорт
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">Избранное пусто</div>
      </section>
    );
  }

  return (
    <section id="favorites-section" className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Избранные промпты</h3>
        <div className="flex items-center gap-2">
          <button onClick={handleExportAll} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
            Экспорт
          </button>
          <button onClick={handleImportClick} className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50">
            Импорт
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto">
        {favorites.map((fav) => (
          <article key={fav.id} className="rounded-xl border px-3 py-2 text-sm">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" title={fav.title}>
                  {fav.title}
                </div>
                <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-gray-500">
                  {fav.prompt}
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => onUseFavorite(fav.prompt)}
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                >
                  Использовать
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteFavorite(fav.id)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Удалить
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(fav)}
                  className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                >
                  Поделиться
                </button>
              </div>
            </div>

            <div className="mt-1 text-[10px] text-gray-400">{new Date(fav.createdAt).toLocaleString()}</div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default FavoritesList;
