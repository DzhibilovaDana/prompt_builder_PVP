"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [systemUnavailable, setSystemUnavailable] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSystemUnavailable(false);
    setFormError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/");
        return;
      }

      if (res.status >= 500) {
        setSystemUnavailable(true);
        return;
      }

      setFormError(data.error || "Не удалось выполнить вход");
    } catch {
      setSystemUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Авторизация</h2>

      {systemUnavailable ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Система временно недоступна. Попробуйте позже.
        </div>
      ) : null}

      {formError ? (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</div>
      ) : null}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm">Email / логин</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm">Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <button type="submit" disabled={loading} className="rounded bg-black text-white px-4 py-2">
            {loading ? "..." : "Войти"}
          </button>
        </div>
        <div className="text-sm text-gray-600">
          Нет аккаунта?{" "}
          <Link href="/auth/register" className="font-medium text-black underline">
            Регистрация
          </Link>
        </div>
      </form>
    </div>
  );
}
