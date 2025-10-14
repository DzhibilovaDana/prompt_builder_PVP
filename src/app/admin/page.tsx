// app/admin/page.tsx
import ConfigEditor from "@/components/ConfigEditor";

export default function AdminPage() {
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
