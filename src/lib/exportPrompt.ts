function downloadFile(filename: string, content: string, mimeType: string) {
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

export function buildTxtExport(promptText: string): string {
  return promptText || "";
}

export function buildMdExport(promptText: string): string {
  return promptText || "";
}

export function buildHtmlExport(promptText: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Prompt export</title>
</head>
<body>
  <pre>${escapeHtml(promptText || "")}</pre>
</body>
</html>`;
}

export function exportPromptAsTxt(promptText: string) {
  downloadFile(makeFilename("txt"), buildTxtExport(promptText), "text/plain;charset=utf-8");
}

export function exportPromptAsMarkdown(promptText: string) {
  downloadFile(makeFilename("md"), buildMdExport(promptText), "text/markdown;charset=utf-8");
}

export function exportPromptAsHtml(promptText: string) {
  downloadFile(makeFilename("html"), buildHtmlExport(promptText), "text/html;charset=utf-8");
}
