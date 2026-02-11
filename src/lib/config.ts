// src/lib/config.ts
import { promises as fs } from "fs";
import path from "path";

export type Expert = {
  name: string;
  promptTemplate?: string; // текст, используемый для роли этого эксперта (по желанию)
};

export type Industry = {
  name: string;
  promptTemplate?: string; // шаблон для всей индустрии: можно использовать {{experts}} и {{industry}}
  experts: Expert[];
};


export type ExtraFieldItem = {
  value: string;
  promptTemplate?: string; // как включать это значение в промпт
};

export type ExtraField = {
  id: string;               // стабильный ключ (используем для values)
  label: string;            // отображение в UI
  type: "list" | "text" | "boolean";
  hint?: string;
  promptTemplate?: string;  // общий шаблон для поля
  items?: ExtraFieldItem[]; // для type=list
};

export type SubOption = {
  label: string;
  promptTemplate?: string;
  // ВАЖНО: в config.json для staffing подвариант содержит fields:
  fields?: ExtraField[];    // <-- добавляем
};

export type Format = {
  id: string;
  label: string;
  subOptionsLabel?: string;
  subOptions: SubOption[];
  extraFields?: ExtraField[];
};

export type AppConfig = {
  industries: Industry[];
  formats: Format[];
  common?: {
    fields?: ExtraField[];
  };
};

// путь к файлу конфигурации
const CONFIG_PATH = path.join(process.cwd(), "src", "data", "config.json");

export async function readConfig(): Promise<AppConfig> {
  const raw = await fs.readFile(CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as AppConfig;
}

export async function writeConfig(cfg: AppConfig): Promise<void> {
  if (!Array.isArray(cfg.industries) || !Array.isArray(cfg.formats)) {
    throw new Error("Неверный формат конфигурации");
  }
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
}
