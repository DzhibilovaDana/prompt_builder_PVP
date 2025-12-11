// components/FavoritesList.tsx
import React from "react";
import type { FavoritePrompt } from "@/hooks/useFavorites";

interface FavoritesListProps {
  favorites: FavoritePrompt[];
  onUseFavorite: (prompt: string) => void;
  onDeleteFavorite: (id: string) => void;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  favorites,
  onUseFavorite,
  onDeleteFavorite,
}) => {
  if (!favorites.length) {
    // если хочешь, можно вернуть пустой блок с текстом "Избранное пусто"
    return null;
  }

  return (
    <section
      id="favorites-section"
      className="mt-6 rounded-2xl border bg-white p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Избранные промпты</h3>
        <span className="text-xs text-gray-500">
          {favorites.length} сохранено
        </span>
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto">
        {favorites.map((fav) => (
          <article
            key={fav.id}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="truncate text-sm font-medium"
                  title={fav.title}
                >
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
              </div>
            </div>

            <div className="mt-1 text-[10px] text-gray-400">
              {new Date(fav.createdAt).toLocaleString()}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
