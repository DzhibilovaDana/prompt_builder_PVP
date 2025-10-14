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

// config.ts или в API /config
const textExtraFields: ExtraField[] = [
  { id: "length", label: "Длина / объём", type: "text", hint: "Например: минимум 200 слов / максимум 5 абзацев" },
  { id: "tone", label: "Стиль / тон", type: "list", items: [
      { value: "формальный" }, { value: "дружелюбный" }, { value: "научный" },
      { value: "популярный" }, { value: "юмористический" }
    ], hint: "Выберите желаемый стиль текста"
  },
  { id: "structure", label: "Структура / формат", type: "list", items: [
      { value: "эссе" }, { value: "список" }, { value: "обзор" }, 
      { value: "аргумент" }, { value: "отзыв" }, { value: "инструкции" }
    ], hint: "Например, «шаг за шагом»"
  },
  { id: "audience", label: "Целевая аудитория", type: "list", items: [
      { value: "профессионалы" }, { value: "новички" }, { value: "дети" }, { value: "общий круг" }
    ]
  },
  { id: "delivery", label: "Формат доставки", type: "list", items: [
      { value: "тема + пункты" }, { value: "подзаголовки" }, { value: "маркированный список" }, { value: "прозаическое изложение" }
    ]
  },
  { id: "language", label: "Язык", type: "list", items: [
      { value: "русский" }, { value: "английский" }, { value: "другой" }
    ]
  },
  { id: "keyPoints", label: "Ключевые точки / тезисы", type: "text", hint: "Что обязательно включить" },
  { id: "exclude", label: "То, что не включать", type: "text", hint: "Шаблоны, технические термины, субъективное и т.п." }
];
