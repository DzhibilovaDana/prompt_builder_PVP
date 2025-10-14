// components/Sidebar.tsx
import React from "react";

export const Sidebar: React.FC = () => {
  return (
    <aside className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold">Модель ИИ</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">скоро</span>
        </div>
        <select disabled className="w-full cursor-not-allowed rounded-xl border bg-gray-100 px-3 py-2 text-gray-500">
          <option>GPT-4o</option>
          <option>Claude 3.5</option>
          <option>Модель по API</option>
        </select>
        <p className="mt-2 text-xs text-gray-500">В прототипе выбор модели не активен.</p>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold">Золотые промпты</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">скоро</span>
        </div>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="rounded-xl border p-3">Анализ конкурентного ландшафта</li>
          <li className="rounded-xl border p-3">JTBD-интервью: сценарий вопросов</li>
          <li className="rounded-xl border p-3">SQL-ассистент для витрин данных</li>
        </ul>
        <p className="mt-2 text-xs text-gray-500">Будет доступен поиск, теги и предпросмотр.</p>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold">История запросов</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">скоро</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="truncate pr-2">[Q] Прогноз спроса Q3 по категориям...</span>
            <div className="flex gap-2">
              <button className="cursor-not-allowed rounded-lg bg-gray-100 px-2 py-1 text-gray-400">👍</button>
              <button className="cursor-not-allowed rounded-lg bg-gray-100 px-2 py-1 text-gray-400">👎</button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="truncate pr-2">[Q] Сегментация пользователей для CRM...</span>
            <div className="flex gap-2">
              <button className="cursor-not-allowed rounded-lg bg-gray-100 px-2 py-1 text-gray-400">👍</button>
              <button className="cursor-not-allowed rounded-lg bg-gray-100 px-2 py-1 text-gray-400">👎</button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Лайки/дизлайки и переиспользование запросов будут позже.</p>
      </div>
    </aside>
  );
};