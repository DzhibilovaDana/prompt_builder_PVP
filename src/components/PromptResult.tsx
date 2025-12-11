// components/PromptResult.tsx
import React from "react";

interface PromptResultProps {
  generatedPrompt: string;
  copied: boolean;
  onCopy: () => void;
  refine: string;
  onRefineChange: (value: string) => void;
  onRefineApply: () => void;

  // НОВОЕ:
  onExportMarkdown: () => void;
  onExportHtml: () => void;
}

export const PromptResult: React.FC<PromptResultProps> = ({
  generatedPrompt,
  copied,
  onCopy,
  refine,
  onRefineChange,
  onRefineApply,
  onExportMarkdown,
  onExportHtml,
}) => {
  const disabled = !generatedPrompt;

  return (
    <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Сформированный промпт</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            disabled={disabled}
            className={`rounded-xl px-3 py-1 text-sm ${
              !disabled
                ? "border bg-white hover:bg-gray-50"
                : "cursor-not-allowed border bg-gray-100 text-gray-400"
            }`}
          >
            {copied ? "Скопировано ✓" : "Копировать"}
          </button>

          {/* НОВО: экспорт в Markdown */}
          <button
            onClick={onExportMarkdown}
            disabled={disabled}
            className={`rounded-xl px-3 py-1 text-sm ${
              !disabled
                ? "border bg-white hover:bg-gray-50"
                : "cursor-not-allowed border bg-gray-100 text-gray-400"
            }`}
          >
            .md
          </button>

          {/* НОВО: экспорт в HTML */}
          <button
            onClick={onExportHtml}
            disabled={disabled}
            className={`rounded-xl px-3 py-1 text-sm ${
              !disabled
                ? "border bg-white hover:bg-gray-50"
                : "cursor-not-allowed border bg-gray-100 text-gray-400"
            }`}
          >
            .html
          </button>
        </div>
      </div>

      <pre className="max-h-[420px] overflow-auto rounded-xl bg-gray-900 p-4 text-sm text-gray-100">
        {generatedPrompt ||
          'Здесь появится итоговый промпт после нажатия кнопки "Сгенерировать промпт".'}
      </pre>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium">Уточнить запрос</label>
        <div className="flex gap-2">
          <input
            value={refine}
            onChange={(e) => onRefineChange(e.target.value)}
            placeholder="Напр.: «перепиши короче»"
            className="w-full rounded-xl border px-3 py-2"
          />
          <button
            onClick={onRefineApply}
            disabled={disabled}
            className={`shrink-0 rounded-xl px-4 py-2 text-white ${
              !disabled
                ? "bg-gray-900 hover:opacity-90"
                : "cursor-not-allowed bg-gray-400"
            }`}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};
