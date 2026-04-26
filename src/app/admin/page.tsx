// app/admin/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ConfigEditor from "@/components/ConfigEditor";
import { getSessionUserWithRole, isAdminRole } from "@/lib/authz";

export default async function AdminPage() {
  const cookieHeader = (await cookies()).toString();
  const { user, role } = await getSessionUserWithRole(new Request("http://localhost/admin", { headers: { cookie: cookieHeader } }));

  if (!user) {
    redirect("/auth/login");
  }

  if (!isAdminRole(role)) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Админка · Справочники</h1>
      <p className="mb-6 text-sm text-gray-600">
        Здесь можно редактировать отрасли, экспертов, форматы и их подварианты. Изменения сохраняются в <code>src/data/config.json</code>.
      </p>
      <ConfigEditor />
    </main>
  );
}