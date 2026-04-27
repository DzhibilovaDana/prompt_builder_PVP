"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: number;
  email: string;
  name: string | null;
  is_admin: boolean;
  must_change_password: boolean;
  created_at: string;
  prompt_count: number;
};

type AdminPrompt = {
  id: number;
  title: string;
  created_at: string;
  user_id: number | null;
  user_email: string | null;
  user_name: string | null;
};

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, promptsRes] = await Promise.all([fetch("/api/admin/users", { cache: "no-store" }), fetch("/api/admin/prompts", { cache: "no-store" })]);
      if (!usersRes.ok || !promptsRes.ok) throw new Error("Не удалось загрузить админ-данные");
      const usersData = (await usersRes.json()) as AdminUser[];
      const promptsData = (await promptsRes.json()) as AdminPrompt[];
      setUsers(Array.isArray(usersData) ? usersData : []);
      setPrompts(Array.isArray(promptsData) ? promptsData : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (id: number) => {
    if (!confirm("Удалить пользователя и его промпты?")) return;
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Ошибка удаления");
      return;
    }
    await load();
  };

  const onRename = async (id: number, currentName: string | null) => {
    const nextName = prompt("Введите новое имя пользователя:", currentName || "");
    if (nextName === null) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: nextName.trim() }),
    });
    if (!res.ok) {
      alert("Не удалось изменить имя");
      return;
    }
    await load();
  };

  if (loading) return <p className="text-sm text-gray-500">Загрузка админ-данных...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Пользователи</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Имя</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Роль</th>
                <th className="px-3 py-2 text-left">Промптов</th>
                <th className="px-3 py-2 text-left">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.filter((item) => !item.is_admin).map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2">{u.id}</td>
                  <td className="px-3 py-2">{u.name || "—"}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.is_admin ? "admin" : "user"}</td>
                  <td className="px-3 py-2">{u.prompt_count}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button className="rounded bg-gray-100 px-2 py-1" onClick={() => void onRename(u.id, u.name)}>
                      Изменить имя
                    </button>
                    <button className="rounded bg-red-600 px-2 py-1 text-white" onClick={() => void onDelete(u.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Промпты пользователей</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Название</th>
                <th className="px-3 py-2 text-left">Пользователь</th>
                <th className="px-3 py-2 text-left">Дата</th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">{p.id}</td>
                  <td className="px-3 py-2">{p.title}</td>
                  <td className="px-3 py-2">{p.user_name || p.user_email || "—"}</td>
                  <td className="px-3 py-2">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
