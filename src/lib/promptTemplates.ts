// src/lib/promptTemplates.ts
import type { AppConfig } from "@/lib/config";
import { getDefaultPrompt } from "./defaultPrompts";

// Возвращает шаблон для выбранного пункта списка (select/list)
export const getPromptFromSelection = (
  config: AppConfig,
  formatId: string,
  fieldId: string,
  value: string
): string => {
  if (!value || value === "Выберите вариант") {
    return getDefaultPrompt(config, formatId, fieldId);
  }
  const fmt = config.formats.find(f => f.id === formatId);
  const field = fmt?.extraFields?.find(f => f.id === fieldId);
  // Если поле не list — ведём себя как для текстового (фолбэк)
  if (!field || field.type !== "list") {
    const def = getDefaultPrompt(config, formatId, fieldId);
    return def ? def.replace(/\{\{\s*value\s*\}\}/g, value) : `${field?.label ?? fieldId}: ${value}.`;
  }
  const item = field.items?.find(i => i.value === value);
  if (item?.promptTemplate && item.promptTemplate.trim().length > 0) {
    return item.promptTemplate;
  }
  // Фолбэк — нормализуем в читабельную фразу
  return `${field.label}: ${value}.`;
};

// Возвращает шаблон для саб‑опции формата
export const getSubOptionPrompt = (
  config: AppConfig,
  formatId: string,
  subOptionLabel: string
): string => {
  if (!subOptionLabel || subOptionLabel === "Выберите вариант") {
    return "";
  }
  const fmt = config.formats.find(f => f.id === formatId);
  const sub = fmt?.subOptions?.find(s => s.label === subOptionLabel);
  return sub?.promptTemplate ?? "";
};