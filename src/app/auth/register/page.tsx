"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (res.ok) {
        // redirect to home
        router.push("/");
      } else {
        alert(data.error || "Registration error");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert("Error: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Регистрация</h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm">Имя (необязательно)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border px-3 py-2" />
        </div>
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
            {loading ? "..." : "Зарегистрироваться"}
          </button>
        </div>
      </form>
    </div>
  );
}
