"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // минимальная валидация
    if (!email.trim() || !password.trim()) {
      setError("Email и пароль обязательны");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть минимум 6 символов");
      return;
    }

    setLoading(true);
    try {
      // 1) регистрация
            const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name.trim() || undefined,
                email: email.trim(),
                password,
            }),
            });

            // читаем ответ как текст, чтобы увидеть даже HTML-ошибки
            const raw = await res.text();

            // пробуем распарсить JSON
            let payload: any = {};
            try {
            payload = raw ? JSON.parse(raw) : {};
            } catch {
            payload = {};
            }

            if (!res.ok) {
            setError(payload?.error || raw || `Ошибка регистрации (HTTP ${res.status})`);
            return;
            }

// дальше твой успешный сценарий (автологин/редирект)


      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Ошибка регистрации");
        return;
      }

      // 2) автологин (не обязательно, но удобно)
      const loginRes = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (loginRes?.ok) {
        router.push("/");
        router.refresh();
      } else {
        // если автологин не прошёл — отправим на логин
        router.push("/login");
      }
    } catch (err) {
      setError("Ошибка сети/сервера");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>Регистрация</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Имя (необязательно)
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </label>

        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ width: "100%", padding: 8 }} />
        </label>

        <label>
          Пароль
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" style={{ width: "100%", padding: 8 }} />
        </label>

        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <button disabled={loading} type="submit" style={{ padding: 10, cursor: "pointer" }}>
          {loading ? "Регистрирую…" : "Создать аккаунт"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Уже есть аккаунт? <Link href="/login">Войти</Link>
      </p>
    </main>
  );
}
