import React from "react";

interface PromptResultProps {
  generatedPrompt: string;
  copied: boolean;
  onCopy: () => void;
  refine: string;
  onRefineChange: (value: string) => void;
  onRefineApply: () => void;
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const PromptResult: React.FC<PromptResultProps> = ({
  generatedPrompt,
  copied,
  onCopy,
  refine,
  onRefineChange,
  onRefineApply,
}) => {
  const canExport = Boolean(generatedPrompt);

  const handleDownloadTxt = () => {
    downloadFile("prompt.txt", generatedPrompt, "text/plain;charset=utf-8");
  };

  const handleDownloadMd = () => {
    const md = `\`\`\`text\n${generatedPrompt}\n\`\`\`\n`;
    downloadFile("prompt.md", md, "text/markdown;charset=utf-8");
  };

  const handleDownloadHtml = () => {
    const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Prompt</title>
</head>
<body>
  <pre style="white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${escapeHtml(generatedPrompt)}</pre>
</body>
</html>
`;
    downloadFile("prompt.html", html, "text/html;charset=utf-8");
  };

  return (
    <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Сформированный промпт</h3>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onCopy}
            disabled={!canExport}
            className={`rounded-xl px-3 py-1 text-sm ${
              canExport
                ? "border bg-white hover:bg-gray-50"
                : "cursor-not-allowed border bg-gray-100 text-gray-400"
            }`}
          >
            {copied ? "Скопировано ✓" : "Копировать"}
          </button>

          <button
            onClick={handleDownloadTxt}
            disabled={!canExport}
            className={`rounded-xl px-3 py-1 text-sm ${
              canExport
                ? "border bg-white hover:bg-gray-50"
                : "cursor-not-allowed border bg-gray-100 text-gray-400"
            }`}
          >
            Скачать TXT
          </button>

          <button
            onClick={handleDownloadMd}
            disabled={!canExport}
            className={`rounded-xl px-3 py-1 text-sm ${
              canExport
                ? "border bg-white hover:bg-gray-50"
                : "cursor-not-allowed border bg-gray-100 text-gray-400"
            }`}
          >
            Скачать MD
          </button>

          <button
            onClick={handleDownloadHtml}
            disabled={!canExport}
            className={`rounded-xl px-3 py-1 text-sm ${
              canExport
                ? "border bg-white hover:bg-gray-50"
                : "cursor-not-allowed border bg-gray-100 text-gray-400"
            }`}
          >
            Скачать HTML
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
            disabled={!generatedPrompt}
            className={`shrink-0 rounded-xl px-4 py-2 text-white ${
              generatedPrompt ? "bg-gray-900 hover:opacity-90" : "cursor-not-allowed bg-gray-400"
            }`}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};