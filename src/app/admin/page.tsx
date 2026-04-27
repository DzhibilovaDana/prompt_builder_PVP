import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ConfigEditor from "@/components/ConfigEditor";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import AdminToolbar from "@/components/admin/AdminToolbar";
import { getSessionUserWithRole } from "@/lib/authz";

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
      <h1 className="mb-4 text-2xl font-semibold">Админка</h1>
      <AdminToolbar />
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="mb-2 font-medium">Инструкция администратора:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>управляйте аккаунтами пользователей: имя, доступы и удаление;</li>
          <li>отслеживайте пользовательские промпты и активность;</li>
          <li>редактируйте справочники генератора (форматы, эксперты, отрасли);</li>
          <li>используйте «Сменить пароль» и «Выйти» в верхней панели.</li>
        </ul>
      </div>
      <h2 className="mb-2 text-lg font-semibold">Справочники генератора</h2>
      <p className="mb-6 text-sm text-gray-600">
        Здесь можно редактировать отрасли, экспертов, форматы и их подварианты. Изменения сохраняются в <code>src/data/config.json</code>.
      </p>
      <ConfigEditor />
      <div className="mt-10 border-t pt-8">
        <AdminUsersPanel />
      </div>
    </main>
  );
}
