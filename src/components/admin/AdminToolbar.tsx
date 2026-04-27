"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminToolbar() {
  const [busy, setBusy] = useState(false);

  const doLogout = async (redirectToLogin: boolean) => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = redirectToLogin ? "/auth/login" : "/";
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Ошибка выхода";
      alert(message);
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <Link href="/auth/change-password" className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900 hover:bg-amber-200">
        Сменить пароль
      </Link>
      <button
        onClick={() => void doLogout(true)}
        disabled={busy}
        className="rounded-full bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
      >
        Сменить пользователя
      </button>
      <button
        onClick={() => void doLogout(false)}
        disabled={busy}
        className="rounded-full bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
      >
        {busy ? "Выход..." : "Выйти"}
      </button>
    </div>
  );
}
