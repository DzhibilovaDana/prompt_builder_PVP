// src/hooks/useFavorites.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

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
  const { status } = useSession();
  const isAuth = status === "authenticated";

  const [favorites, setFavorites] = useState<FavoritePrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- SERVER LOAD ---
  const loadServerFavorites = useCallback(async () => {
    const res = await fetch("/api/favorites", { method: "GET" });
    if (!res.ok) return;
    const data = (await res.json()) as FavoritePrompt[];
    setFavorites(data);
  }, []);

  // --- INIT LOAD ---
  useEffect(() => {
    (async () => {
      setLoading(true);

      if (!isAuth) {
        // Гость: грузим из localStorage (как было)
        const local = safeParse(localStorage.getItem(STORAGE_KEY));
        setFavorites(local);
        setLoading(false);
        return;
      }

      // Логин: (опционально) синхронизируем localStorage -> сервер
      const local = safeParse(localStorage.getItem(STORAGE_KEY));
      if (local.length > 0) {
        for (const item of local) {
          try {
            await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: item.title, prompt: item.prompt }),
            });
          } catch {
            // если сеть упала — просто не синхронизируем часть
          }
        }
        // очистим localStorage после попытки синхронизации
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }

      // После синхронизации — грузим серверное избранное
      await loadServerFavorites();
      setLoading(false);
    })();
  }, [isAuth, loadServerFavorites]);

  // --- SAVE LOCAL (только для гостей) ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAuth) return; // авторизованный — источник истины сервер
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error("Не удалось сохранить избранное", e);
    }
  }, [favorites, isAuth]);

  // --- ADD ---
  const addFavorite = useCallback(
    async (prompt: string, title: string) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) return;

      if (!isAuth) {
        // Гость: локально (как у тебя)
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
        setFavorites((prev) => [newItem, ...prev]);
        return;
      }

      // Логин: на сервер
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, prompt: trimmedPrompt }),
      });

      if (!res.ok) return;

      const created = (await res.json()) as FavoritePrompt;

      // вставим в начало, но избегаем дубля по id
      setFavorites((prev) => {
        if (prev.some((x) => x.id === created.id)) return prev;
        return [created, ...prev];
      });
    },
    [isAuth]
  );

  // --- REMOVE ---
  const removeFavorite = useCallback(
    async (id: string) => {
      if (!isAuth) {
        setFavorites((prev) => prev.filter((x) => x.id !== id));
        return;
      }

      const res = await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) return;

      setFavorites((prev) => prev.filter((x) => x.id !== id));
    },
    [isAuth]
  );

  // --- CLEAR (опционально) ---
  const clearFavorites = useCallback(async () => {
    if (!isAuth) {
      setFavorites([]);
      return;
    }
    // если хочешь “очистить всё на сервере” — добавим отдельный endpoint позже
    // пока просто можно перезагрузить с сервера или оставить как есть
    await loadServerFavorites();
  }, [isAuth, loadServerFavorites]);

  return { favorites, addFavorite, removeFavorite, clearFavorites, loading };
}
