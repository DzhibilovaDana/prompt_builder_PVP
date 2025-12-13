"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // если уже залогинена — можно сразу увести на главную
  if (status === "authenticated") {
    router.push("/");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email и пароль обязательны");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (res?.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Неверный email или пароль");
      }
    } catch {
      setError("Ошибка сети/сервера");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>Вход</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
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
          {loading ? "Вхожу…" : "Войти"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Нет аккаунта? <Link href="/register">Регистрация</Link>
      </p>
    </main>
  );
}
