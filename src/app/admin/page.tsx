import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserWithRole } from "@/lib/authz";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";

export default async function AdminPage() {
  const cookieHeader = (await cookies()).toString();
  const { user, isAdmin, mustChangePassword } = await getSessionUserWithRole(new Request("http://localhost/admin", { headers: { cookie: cookieHeader } }));

  if (!user) {
    redirect("/auth/login");
  }

  if (!isAdmin) {
    redirect("/");
  }

  if (mustChangePassword) {
    redirect("/auth/change-password");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-2 text-2xl font-semibold">Админка · Пользователи</h1>
      <p className="mb-6 text-sm text-gray-600">Управление пользователями и просмотр их промптов.</p>
      <AdminUsersPanel />
    </main>
  );
}
