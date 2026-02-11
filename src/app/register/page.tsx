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

    if (!email.trim() || !password.trim()) {
        setError("Email и пароль обязательны");
        return;
    }
    // Согласовано с сервером: минимум 8
    if (password.length < 8) {
        setError("Пароль должен быть минимум 8 символов");
        return;
    }

    setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name.trim() || undefined,
                email: email.trim(),
                password,
            }),
            });

            // пытаемся получить JSON-ответ
            const payload = await res.json().catch(() => ({}));

            if (!res.ok) {
            setError(payload?.error || `Ошибка регистрации (HTTP ${res.status})`);
            return;
            }

            // автологин
            const loginRes = await signIn("credentials", {
            redirect: false,
            email: email.trim(),
            password,
            });

            if (loginRes?.ok) {
            router.push("/");
            router.refresh();
            } else {
            router.push("/login");
            }
        } catch (err) {
            console.error(err);
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
