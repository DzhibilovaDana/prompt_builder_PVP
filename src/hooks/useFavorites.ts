// src/hooks/useFavorites.ts
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
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);

  // Попытка получить список с сервера; если не удаётся — fallback localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const res = await fetch("/api/prompts");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setFavorites(data);
            setServerAvailable(true);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch {}
            return;
          }
        }
        // Если сервер не вернул список, fallback:
        throw new Error("Server unavailable");
      } catch {
        const data = safeParse(localStorage.getItem(STORAGE_KEY));
        setFavorites(data);
        setServerAvailable(false);
      }
    })();
  }, []);

  // Сохранение в localStorage при изменении списка (в любом случае)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error("Не удалось сохранить избранное", e);
    }
  }, [favorites]);

  // addFavorite: пытаемся сохранить на сервере; если сервер доступен — используем его ответ
  const addFavorite = useCallback(async (prompt: string, title: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return null;

    // Try server if known available or unknown (try once)
    if (serverAvailable !== false) {
      try {
        const res = await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, prompt: trimmedPrompt }),
        });
        if (res.ok) {
          const created = await res.json();
          setFavorites((prev) => [created, ...prev]);
          setServerAvailable(true);
          return created as FavoritePrompt;
        } else {
          // server responded with error -> mark serverUnavailable and fallback
          setServerAvailable(false);
        }
      } catch (e) {
        setServerAvailable(false);
      }
    }

    // Fallback local
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const newItem: FavoritePrompt = {
      id,
      title: title.trim() || "Промпт без названия",
      prompt: trimmedPrompt,
      createdAt: new Date().toISOString(),
    };
    setFavorites((prev) => [newItem, ...prev]);
    return newItem;
  }, [serverAvailable]);

  // removeFavorite: try server delete, else local
  const removeFavorite = useCallback(async (id: string) => {
    if (!id) {
      setFavorites((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    if (serverAvailable !== false) {
      try {
        const res = await fetch(`/api/prompts/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setFavorites((prev) => prev.filter((item) => item.id !== id));
          setServerAvailable(true);
          return;
        } else {
          setServerAvailable(false);
        }
      } catch {
        setServerAvailable(false);
      }
    }
    // fallback local
    setFavorites((prev) => prev.filter((item) => item.id !== id));
  }, [serverAvailable]);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { favorites, addFavorite, removeFavorite, clearFavorites, serverAvailable };
}
