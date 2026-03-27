// src/components/Sidebar.tsx
import React from "react";

export type ProviderInfo = { id: string; label: string; description?: string };
type ProviderKeys = {
  openaiApiKey?: string;
  deepseekApiKey?: string;
  yandexApiKey?: string;
  yandexFolderId?: string;
  yandexModelUri?: string;
  anthropicApiKey?: string;
};

interface SidebarProps {
  // optional props: if provided, Sidebar will render provider checkboxes
  availableProviders?: ProviderInfo[];
  selectedProviders?: string[];
  onProvidersChange?: (providers: string[]) => void;
  providerKeys?: ProviderKeys;
  onProviderKeysChange?: (keys: ProviderKeys) => void;
  onSharePreset?: () => void;
  presetCopied?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  availableProviders,
  selectedProviders = [],
  onProvidersChange,
  providerKeys,
  onProviderKeysChange,
  onSharePreset,
  presetCopied = false,
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

  const updateProviderKey = (key: keyof ProviderKeys, value: string) => {
    if (!onProviderKeysChange) return;
    onProviderKeysChange({
      ...(providerKeys ?? {}),
      [key]: value.trim() ? value : undefined,
    });
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

            <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
              <summary className="cursor-pointer text-xs font-medium text-gray-700">
                API ключи (локально, только для вашего браузера)
              </summary>
              <div className="mt-3 space-y-3">
                {selectedProviders.includes("openai") ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700" htmlFor="openaiApiKey">
                      OpenAI API key
                    </label>
                    <input
                      id="openaiApiKey"
                      type="password"
                      value={providerKeys?.openaiApiKey ?? ""}
                      onChange={(e) => updateProviderKey("openaiApiKey", e.target.value)}
                      className="w-full rounded-md border bg-white px-2 py-1.5 text-xs"
                      placeholder="sk-..."
                    />
                    <p className="text-[11px] text-gray-500">OpenAI: Platform → API keys → Create new secret key.</p>
                  </div>
                ) : null}

                {selectedProviders.includes("deepseek") ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700" htmlFor="deepseekApiKey">
                      DeepSeek API key
                    </label>
                    <input
                      id="deepseekApiKey"
                      type="password"
                      value={providerKeys?.deepseekApiKey ?? ""}
                      onChange={(e) => updateProviderKey("deepseekApiKey", e.target.value)}
                      className="w-full rounded-md border bg-white px-2 py-1.5 text-xs"
                      placeholder="sk-..."
                    />
                    <p className="text-[11px] text-gray-500">DeepSeek: Platform → API Keys → Create.</p>
                  </div>
                ) : null}

                {selectedProviders.includes("yandex") ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700" htmlFor="yandexApiKey">
                      Yandex API key
                    </label>
                    <input
                      id="yandexApiKey"
                      type="password"
                      value={providerKeys?.yandexApiKey ?? ""}
                      onChange={(e) => updateProviderKey("yandexApiKey", e.target.value)}
                      className="w-full rounded-md border bg-white px-2 py-1.5 text-xs"
                      placeholder="AQVN..."
                    />
                    <label className="text-xs font-medium text-gray-700" htmlFor="yandexFolderId">
                      Yandex Folder ID
                    </label>
                    <input
                      id="yandexFolderId"
                      type="text"
                      value={providerKeys?.yandexFolderId ?? ""}
                      onChange={(e) => updateProviderKey("yandexFolderId", e.target.value)}
                      className="w-full rounded-md border bg-white px-2 py-1.5 text-xs"
                      placeholder="b1g..."
                    />
                    <p className="text-[11px] text-gray-500">Yandex Cloud: сервисный аккаунт + ключ в IAM, Folder ID из консоли.</p>
                  </div>
                ) : null}

                {selectedProviders.includes("claude") ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700" htmlFor="anthropicApiKey">
                      Anthropic API key
                    </label>
                    <input
                      id="anthropicApiKey"
                      type="password"
                      value={providerKeys?.anthropicApiKey ?? ""}
                      onChange={(e) => updateProviderKey("anthropicApiKey", e.target.value)}
                      className="w-full rounded-md border bg-white px-2 py-1.5 text-xs"
                      placeholder="sk-ant-..."
                    />
                    <p className="text-[11px] text-gray-500">Anthropic Console → API Keys → Create Key.</p>
                  </div>
                ) : null}
              </div>
            </details>

            {onSharePreset ? (
              <div className="mt-3 rounded-lg border border-gray-200 bg-white p-2">
                <button
                  type="button"
                  onClick={onSharePreset}
                  className="w-full rounded-md border px-2 py-1.5 text-xs font-medium hover:bg-gray-50"
                >
                  {presetCopied ? "Ссылка на пресет скопирована" : "Поделиться пресетом ссылкой"}
                </button>
                <p className="mt-1 text-[11px] text-gray-500">
                  Ссылка включает выбранные параметры (индустрия, формат, эксперты, задача).
                </p>
              </div>
            ) : null}
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
