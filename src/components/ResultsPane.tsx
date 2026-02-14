// src/components/ResultsPane.tsx
import React from "react";

export type ProviderResult = {
  status: "ok" | "error" | "pending";
  output?: string;
  error?: string;
  model?: string;
  timeMs?: number;
};

interface ResultsPaneProps {
  results: Record<string, ProviderResult> | null;
  mode?: "ok" | "degraded" | "error";
}

export const ResultsPane: React.FC<ResultsPaneProps> = ({ results, mode = "ok" }) => {
  if (mode === "degraded") {
    return (
      <div className="mt-6 rounded-2xl border bg-amber-50 p-4 text-amber-800 shadow-sm">
        <strong>Режим деградации:</strong> провайдеры недоступны или не выбраны — система показывает только сформированный
        промпт. Попробуйте выбрать другой провайдер или позже повторите запрос.
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const entries = Object.entries(results);

  return (
    <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-lg font-semibold">Результаты генерации</h4>
      <div className="flex flex-col gap-3">
        {entries.map(([provider, res]) => (
          <div key={provider} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">{provider}</div>
                <div className="text-xs text-gray-500">{res.model ?? ""}</div>
              </div>
              <div>
                {res.status === "pending" && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">в процессе</span>}
                {res.status === "ok" && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">ok</span>}
                {res.status === "error" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">ошибка</span>}
              </div>
            </div>

            {res.status === "ok" && (
              <pre className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm text-gray-800">{res.output}</pre>
            )}

            {res.status === "error" && (
              <div className="text-sm text-red-600">Ошибка: {res.error}</div>
            )}

            {typeof res.timeMs === "number" && <div className="mt-2 text-xs text-gray-400">Время: {res.timeMs} ms</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsPane;
