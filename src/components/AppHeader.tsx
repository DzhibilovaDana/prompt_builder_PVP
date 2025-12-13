"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AppHeader() {
  const { data: session, status } = useSession();

  return (
    <header style={{ display: "flex", gap: 12, alignItems: "center", padding: 16, borderBottom: "1px solid #eee" }}>
      <Link href="/" style={{ fontWeight: 700 }}>
        Prompt Builder
      </Link>

      <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
        {status === "loading" && <span>Загрузка…</span>}

        {status === "unauthenticated" && (
          <>
            <Link href="/login">Войти</Link>
            <Link href="/register">Регистрация</Link>
          </>
        )}

        {status === "authenticated" && (
          <>
            <span style={{ opacity: 0.8 }}>
              Вы вошли как: <b>{session.user?.email || session.user?.name}</b>
            </span>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer" }}
            >
              Выйти
            </button>
          </>
        )}
      </div>
    </header>
  );
}
