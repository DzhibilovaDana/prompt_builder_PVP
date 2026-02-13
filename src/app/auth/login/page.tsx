"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/");
      } else {
        alert(data.error || "Login error");
      }
    } catch (err) {
      alert("Error: " + (err as any)?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Вход</h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm">Email</label>
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
      </form>
    </div>
  );
}
