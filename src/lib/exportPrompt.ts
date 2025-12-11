// src/lib/exportPrompt.ts

function downloadFile(filename: string, content: string, mimeType: string) {
  // На сервере (SSR) просто выходим
  if (typeof window === "undefined") return;

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

// Сделаем простое имя файла: prompt-2025-01-01T10-00-00-000Z.md
function makeFilename(ext: string): string {
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, "-");
  return `prompt-${iso}.${ext}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function exportPromptAsMarkdown(promptText: string) {
  const content = promptText || "";
  downloadFile(makeFilename("md"), content, "text/markdown;charset=utf-8");
}

export function exportPromptAsHtml(promptText: string) {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Prompt export</title>
</head>
<body>
  <pre>${escapeHtml(promptText || "")}</pre>
</body>
</html>`;

  downloadFile(makeFilename("html"), html, "text/html;charset=utf-8");
}
