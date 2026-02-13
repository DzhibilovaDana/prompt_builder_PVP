// src/app/page.tsx
import React from "react";
import type { AppConfig } from "@/lib/config";
import { readConfig } from "@/lib/config";
import PromptBuilderClient from "@/components/PromptBuilderClient";

export const dynamic = "force-dynamic"; // при необходимости, чтобы всегда читалось актуальное

export default async function Page() {
  try {
    // читаем конфиг на сервере (readConfig читает src/data/config.json)
    const cfg: AppConfig = await readConfig();

    // Передаём конфиг в клиентский компонент
    return <PromptBuilderClient config={cfg} />;
  } catch (err: unknown) {
    // Если чтение конфига упало — показываем понятное сообщение
    const message = err instanceof Error ? err.message : "Unknown error";
    return (
      <div className="p-6">
        <div className="rounded-md border bg-white p-6 text-sm text-red-600 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Ошибка загрузки конфигурации</h3>
          <p>Не удалось загрузить конфигурацию приложения:</p>
          <pre className="mt-3 rounded bg-gray-50 p-3 text-xs text-red-700">{String(message)}</pre>
          <p className="mt-3 text-xs text-gray-600">
            Проверьте, пожалуйста, файл <code>src/data/config.json</code> или логи сервера.
          </p>
        </div>
      </div>
    );
  }
}
