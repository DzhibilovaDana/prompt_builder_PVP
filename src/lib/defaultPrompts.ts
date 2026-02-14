// src/lib/defaultPrompts.ts
import type { AppConfig } from "@/lib/config";

/**
 * Возвращает дефолт для поля, если пользователь не задал значение.
 * Дефолты берём из config.json:
 * - для common: config.common.fields[].promptTemplate
 * - для format extra fields (type=text|boolean): field.promptTemplate
 */
export const getDefaultPrompt = (
  config: AppConfig,
  formatId: string,
  fieldId: string
): string => {
  // 1) common
  const common = config.common?.fields ?? [];
  const cf = common.find(f => f.id === fieldId);
  if (cf?.promptTemplate) return cf.promptTemplate;

  // 2) format extra fields
  const fmt = config.formats.find(f => f.id === formatId);
  const ef = fmt?.extraFields?.find(f => f.id === fieldId);
  if (ef?.promptTemplate) return ef.promptTemplate;

  // 3) запасной вариант — пустую строку (лучше не шуметь дефолтом)
  return "";
};

export const getDefaultSubOptionPrompt = (
  config: AppConfig,
  formatId: string
): string => {
  // Если понадобится — добавьте в конфиг defaultSubOptionPrompt для формата
  void config;
  void formatId;
  return ""; 
};