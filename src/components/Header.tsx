"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: number;
  email: string;
  name?: string | null;
};

export const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Обращаемся к /api/auth/me — cookie отправятся автоматически (same-origin).
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (mounted) setUser(null);
          return;
        }
        const data = await res.json();
        if (mounted) setUser(data?.user ?? null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // После логаута проще перезагрузить страницу — все компоненты обновятся и сервер (если нужен) перестроится.
      window.location.href = "/";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert("Ошибка при выходе: " + message);
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-black" aria-hidden="true" />
          <Link href="/" className="text-lg font-semibold hover:underline">
            PromptBuilder · MVP
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          {/* Desktop links / user */}
          {loading ? (
            <div className="px-3 py-1">...</div>
          ) : user ? (
            <>
              <span className="hidden sm:inline">{user.name ?? user.email}</span>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full bg-gray-100 px-3 py-1 hover:bg-gray-200"
                aria-label="Выйти"
              >
                {loggingOut ? "Выход..." : "Выйти"}
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="rounded-full bg-gray-100 px-3 py-1 hover:bg-gray-200">
                Войти
              </Link>
              <Link href="/auth/register" className="rounded-full bg-gray-100 px-3 py-1 hover:bg-gray-200">
                Регистрация
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
