// hooks/useFavorites.ts
import { useCallback, useEffect, useState } from "react";

export interface FavoritePrompt {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
}

const STORAGE_KEY = "prompt_builder_favorites_v1";

function safeParse(json: string | null): FavoritePrompt[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FavoritePrompt =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.prompt === "string"
    );
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritePrompt[]>([]);

  // загрузка из localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const data = safeParse(localStorage.getItem(STORAGE_KEY));
    setFavorites(data);
  }, []);

  // сохранение в localStorage при изменении списка
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error("Не удалось сохранить избранное", e);
    }
  }, [favorites]);

  const addFavorite = useCallback((prompt: string, title: string) => {
    setFavorites((prev) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) return prev;

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const newItem: FavoritePrompt = {
        id,
        title: title.trim() || "Промпт без названия",
        prompt: trimmedPrompt,
        createdAt: new Date().toISOString(),
      };

      // кладём новый в начало
      return [newItem, ...prev];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return { favorites, addFavorite, removeFavorite, clearFavorites };
}
