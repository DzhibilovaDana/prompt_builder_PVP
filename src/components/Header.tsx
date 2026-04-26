"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: number;
  email: string;
  name?: string | null;
};

type Role = "owner" | "admin" | "editor" | "viewer" | null;

export const Header: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (mounted) setUser(null);
          return;
        }
        const data = (await res.json()) as { user: User | null; role?: Role; isAdmin?: boolean; mustChangePassword?: boolean };
        if (mounted) {
          setUser(data?.user ?? null);
          setRole(data?.role ?? null);
          setIsAdmin(Boolean(data?.isAdmin));
          setMustChangePassword(Boolean(data?.mustChangePassword));
        }
      } catch {
        if (mounted) {
          setUser(null);
          setRole(null);
          setIsAdmin(false);
          setMustChangePassword(false);
        }
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
      window.location.href = "/";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert("Ошибка при выходе: " + message);
      setLoggingOut(false);
    }
  };

  const canOpenAdmin = isAdmin;

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-black" aria-hidden="true" />
          <Link href="/" className="text-lg font-semibold hover:underline">
            PromptBuilder
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          {loading ? (
            <div className="px-3 py-1">...</div>
          ) : user ? (
            <>
              {canOpenAdmin ? (
                <Link href="/admin" className="rounded-full bg-gray-100 px-3 py-1 hover:bg-gray-200">
                  Админ
                </Link>
              ) : (
                <Link href="/prompts" className="rounded-full bg-gray-100 px-3 py-1 hover:bg-gray-200">
                  Промпты
                </Link>
              )}
              <span className="hidden sm:inline">{user.name ?? user.email}</span>
              {canOpenAdmin && role ? <span className="hidden rounded-full bg-gray-100 px-3 py-1 sm:inline">Роль: {role}</span> : null}
              {mustChangePassword ? (
                <Link href="/auth/change-password" className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 hover:bg-amber-200">
                  Смените пароль
                </Link>
              ) : null}
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
