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
    return parsed
      .filter(
        (item): item is FavoritePrompt =>
          item &&
          typeof item === "object" &&
          typeof item.id !== "undefined" &&
          typeof item.prompt === "string"
      )
      .map((it) => {
        // Ensure id is string for consistency
        return { ...it, id: String((it as any).id) };
      });
  } catch {
    return [];
  }
}

function looksLikeServerId(id: string) {
  // server ids are integer numeric (we expect), local ones are UUIDs or timestamp-based strings
  return /^\d+$/.test(String(id));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritePrompt[]>([]);
  // null = unknown, true = server available, false = server unavailable
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
            // Normalize ids to strings
            const norm = data.map((d: any) => ({
              id: String(d.id),
              title: d.title || "",
              prompt: d.prompt || d.content || "",
              createdAt: d.createdAt || d.created_at || new Date().toISOString(),
            }));
            setFavorites(norm);
            setServerAvailable(true);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(norm));
            } catch {}
            return;
          }
        }
        throw new Error("Server did not return array");
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

  // Когда сервер становится доступен — синхронизируем локальные промпты, у которых id не выглядит как server id
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (serverAvailable !== true) return;

    const localOnly = favorites.filter((f) => !looksLikeServerId(f.id));
    if (localOnly.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const item of localOnly) {
        if (cancelled) break;
        try {
          const res = await fetch("/api/prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: item.title, prompt: item.prompt }),
          });
          if (!res.ok) {
            // если сервер стал возвращать ошибку — помечаем недоступным и прекращаем синхронизацию
            setServerAvailable(false);
            break;
          }
          const created = await res.json();
          const createdNormalized: FavoritePrompt = {
            id: String(created.id),
            title: created.title,
            prompt: created.prompt ?? created.content ?? item.prompt,
            createdAt: created.createdAt ?? created.created_at ?? new Date().toISOString(),
          };
          setFavorites((prev) =>
            prev.map((p) => (p.id === item.id ? createdNormalized : p))
          );
        } catch (err) {
          console.warn("Sync favorite failed:", err);
          setServerAvailable(false);
          break;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serverAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  // Попытка периодически переподключиться, если сервер недоступен.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Если сервер уже доступен — не делаем ничего
    if (serverAvailable === true) return;

    let cancelled = false;
    const tryConnect = async () => {
      try {
        const res = await fetch("/api/prompts");
        if (!res.ok) throw new Error("no");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("bad");
        // normalize and replace favorites with authoritative server list
        const norm = data.map((d: any) => ({
          id: String(d.id),
          title: d.title || "",
          prompt: d.prompt || d.content || "",
          createdAt: d.createdAt || d.created_at || new Date().toISOString(),
        }));
        setFavorites((prev) => {
          // Prefer server list, but keep local-only items that are not yet on server
          const localOnly = prev.filter((p) => !looksLikeServerId(p.id));
          // If server already has items, merge local-only at top
          return [...localOnly, ...norm];
        });
        setServerAvailable(true);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        } catch {}
      } catch {
        // still not available
      }
    };

    // try immediately, then every 30s
    tryConnect();
    const id = setInterval(() => {
      if (!cancelled) tryConnect();
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [serverAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  // addFavorite: пытаемся сохранить на сервере; если сервер доступен — используем его ответ
  const addFavorite = useCallback(
    async (prompt: string, title: string) => {
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
            const createdNormalized: FavoritePrompt = {
              id: String(created.id),
              title: created.title,
              prompt: created.prompt ?? created.content ?? trimmedPrompt,
              createdAt: created.createdAt ?? created.created_at ?? new Date().toISOString(),
            };
            setFavorites((prev) => [createdNormalized, ...prev]);
            setServerAvailable(true);
            return createdNormalized as FavoritePrompt;
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
    },
    [serverAvailable]
  );

  // removeFavorite: try server delete, else local
  const removeFavorite = useCallback(
    async (id: string) => {
      if (!id) {
        setFavorites((prev) => prev.filter((item) => item.id !== id));
        return;
      }

      if (serverAvailable === true && looksLikeServerId(id)) {
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
    },
    [serverAvailable]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { favorites, addFavorite, removeFavorite, clearFavorites, serverAvailable };
}
