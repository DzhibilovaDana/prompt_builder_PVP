"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось сменить пароль");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/admin"), 800);
    } catch {
      setError("Система временно недоступна");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-xl font-semibold">Смена пароля</h1>
      <p className="mb-4 text-sm text-gray-600">Для администратора обязательно сменить пароль после первого входа.</p>
      {error ? <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {done ? <div className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Пароль обновлён.</div> : null}
      <form className="space-y-3" onSubmit={submit}>
        <div>
          <label className="block text-sm">Текущий пароль</label>
          <input type="password" className="w-full rounded border px-3 py-2" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Новый пароль</label>
          <input type="password" className="w-full rounded border px-3 py-2" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="rounded bg-black px-4 py-2 text-white">{loading ? "..." : "Сменить пароль"}</button>
      </form>
    </div>
  );
}
