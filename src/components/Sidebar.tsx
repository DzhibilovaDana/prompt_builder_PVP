// src/components/Sidebar.tsx
import React from "react";

export type ProviderInfo = { id: string; label: string; description?: string };

interface SidebarProps {
  // optional props: if provided, Sidebar will render provider checkboxes
  availableProviders?: ProviderInfo[];
  selectedProviders?: string[];
  onProvidersChange?: (providers: string[]) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  availableProviders,
  selectedProviders = [],
  onProvidersChange,
}) => {
  const scrollToFavorites = () => {
    const el = document.getElementById("favorites-section");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // toggle provider in selection
  const toggleProvider = (id: string, checked: boolean) => {
    if (!onProvidersChange) return;
    if (checked) {
      onProvidersChange(Array.from(new Set([...(selectedProviders || []), id])));
    } else {
      onProvidersChange((selectedProviders || []).filter((p) => p !== id));
    }
  };

  return (
    <aside className="flex flex-col gap-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold">Модель ИИ</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">статус</span>
        </div>

        {/* If provider props are passed — render selectable list; otherwise render disabled select */}
        {availableProviders && onProvidersChange ? (
          <div className="flex flex-col gap-2">
            {availableProviders.map((prov) => {
              const checked = (selectedProviders || []).includes(prov.id);
              return (
                <label key={prov.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleProvider(prov.id, e.target.checked)}
                    className="h-4 w-4"
                    aria-label={`Выбрать провайдера ${prov.label}`}
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{prov.label}</div>
                    {prov.description && <div className="text-xs text-gray-500">{prov.description}</div>}
                  </div>
                </label>
              );
            })}
            <p className="mt-2 text-xs text-gray-500">Выберите провайдеров для параллельной генерации.</p>
          </div>
        ) : (
          <>
            <select disabled className="w-full cursor-not-allowed rounded-xl border bg-gray-100 px-3 py-2 text-gray-500">
              <option>GPT-4o</option>
              <option>Claude 3.5</option>
              <option>Модель по API</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">В прототипе выбор модели не активен.</p>
          </>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold">Золотые промпты</h3>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">избранное</span>
        </div>
        <button
          type="button"
          onClick={scrollToFavorites}
          className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Открыть список избранных
        </button>
        <p className="mt-2 text-xs text-gray-500">Используй конструктор, чтобы сохранить удачные промпты.</p>
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
        </div>
        <p className="mt-2 text-xs text-gray-500">Лайки/дизлайки и переиспользование запросов будут позже.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
