// hooks/usePromptBuilder.ts
import { useState, useCallback, useMemo, useEffect } from "react";
import type { AppConfig, Format, Industry } from "@/lib/config";
import { getDefaultSubOptionPrompt, getDefaultPrompt } from "@/lib/defaultPrompts";
import { getPromptFromSelection, getSubOptionPrompt } from "@/lib/promptTemplates";
// import { 
//   PROMPT_TEMPLATES, 
//   getPromptFromSelection, 
//   getSubOptionPrompt  
// } from "@/lib/promptTemplates";

type FieldValue = string | boolean | undefined;

// вспомогательная подстановка
const apply = (tpl?: string, v?: string) =>
  (tpl || "").replace(/\{\{\s*value\s*\}\}/g, v ?? "").trim();
const hasValuePlaceholder = (tpl?: string) => !!tpl && /\{\{\s*value\s*\}\}/i.test(tpl || "");
const nonEmpty = (v: unknown) => typeof v === "string" ? v.trim().length > 0 : !!v;
// поле считается "требующим ввода", если это text и шаблон реально ожидает {{value}}
const requiresUserInput = (field: { type?: string; promptTemplate?: string }) =>
  field?.type === "text" && hasValuePlaceholder(field?.promptTemplate || "");


export const usePromptBuilder = (config: AppConfig | null) => {
  const [industry, setIndustry] = useState<string>("");
  const [experts, setExperts] = useState<string[]>([]);
  const [userTask, setUserTask] = useState<string>("");
  const [format, setFormat] = useState<string>("text");
  const [subOption, setSubOption] = useState<string>("");
  const [exclusionInput, setExclusionInput] = useState<string>("");
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [refine, setRefine] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [extraValues, setExtraValues] = useState<Record<string, FieldValue>>({});

  const currentIndustryExperts = useMemo(() => {
    if (!config) return [];
    return config.industries.find((i) => i.name === industry)?.experts.map((e) => e.name) ?? [];
  }, [config, industry]);

  const outputFormats = useMemo<Format[]>(() => config?.formats ?? [], [config]);

  const addExclusion = useCallback(() => {
    const v = exclusionInput.trim();
    if (!v || exclusions.includes(v)) return;
    setExclusions((prev) => [...prev, v]);
    setExclusionInput("");
  }, [exclusionInput, exclusions]);

  const removeExclusion = useCallback((idx: number) => {
    setExclusions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  

// hooks/usePromptBuilder.ts (обновляем buildRolePrompt)
const buildRolePrompt = useCallback((): string => {
  if (!config) return "Действуй как опытный специалист, способный решить поставленную задачу.";

  const ind: Industry | undefined = config.industries.find((i) => i.name === industry);
  const selectedExpertObjs = (ind?.experts || []).filter((e) => experts.includes(e.name));
  const expertFragments = selectedExpertObjs.map((e) => {
    if (e.promptTemplate) return e.promptTemplate.replace("{{expert}}", e.name);
    return e.name;
  });

  // Если выбрана индустрия и эксперты
  if (industry && expertFragments.length > 0) {
    if (ind?.promptTemplate) {
      return ind.promptTemplate
        .replace("{{experts}}", expertFragments.join(", "))
        .replace("{{industry}}", industry);
    }
    return `Действуй как эксперт ${expertFragments.join(", ")} в индустрии ${industry}.`;
  }

  // Если выбрана только индустрия
  if (industry) {
    return `Действуй как специалист с глубоким пониманием индустрии ${industry}. Используй отраслевые знания и best practices.`;
  }

  // Если выбраны только эксперты
  if (expertFragments.length > 0) {
    return `Действуй как ${expertFragments.join(", ")}. Применяй профессиональный подход и экспертные знания.`;
  }

  // Дефолтный промпт если ничего не выбрано
  return "Действуй как опытный профессионал, способный качественно решить поставленную задачу. Используй системный подход и проверенные методики.";
}, [config, industry, experts]);

// hooks/usePromptBuilder.ts (ПЕРЕПИСАННЫЙ buildFormatInstruction)
// --- Надёжный buildFormatInstruction ---
// Инструкция по формату (и саб‑опции) из config.json
const buildFormatInstruction = useCallback((fmtId: string): string => {
  const fmt = outputFormats.find(f => f.id === fmtId);
  if (!fmt) return "Формат ответа: ясный, структурированный текст.";

  const parts: string[] = [];
  parts.push(`Формат ответа: ${fmt.label}.`);

  // саб-опция
  if (subOption && subOption !== "Выберите вариант") {
    const t = getSubOptionPrompt(config!, fmtId, subOption);
    if (t) parts.push(t);
  } else {
    const d = getDefaultSubOptionPrompt(config!, fmtId);
    if (d) parts.push(d);
  }

  for (const field of fmt.extraFields ?? []) {
    const val = extraValues[field.id];

    // BOOLEAN
    if (field.type === "boolean") {
      if (val === true) {
        const t = apply(field.promptTemplate, "да");
        parts.push(t || `${field.label}: да.`);
      }
      continue;
    }

    // Пустое значение
    if (!nonEmpty(val) || val === "Выберите вариант") {
      // Если поле реально требует пользовательского ввода — тихо пропускаем
      if (requiresUserInput(field)) {
        continue; // Ничего не добавляем в промпт
      }
      // Иначе можно подставить дефолт (например, для list без {{value}})
      const def = getDefaultPrompt(config!, fmtId, field.id);
      if (def && def.trim()) parts.push(def);
      continue;
    }


    // LIST
    if (field.type === "list") {
      const item = field.items?.find(i => i.value === val);
      const t = item?.promptTemplate || apply(field.promptTemplate, String(val));
      parts.push(t || `${field.label}: ${val}.`);
      continue;
    }

    // TEXT
    const tpl = field.promptTemplate || "";
    if (hasValuePlaceholder(tpl)) {
      // сюда мы попадаем только с НЕпустым val (см. проверку выше),
      // но на всякий случай проверим ещё раз:
      if (nonEmpty(val)) parts.push(apply(tpl, String(val)));
      // если пусто — ничего не добавляем
    } else if (tpl.trim().length > 0) {
      parts.push(tpl);
      if (nonEmpty(val)) parts.push(`${field.label}: ${val}.`); // fallback только при наличии ввода
    } else {
      if (nonEmpty(val)) parts.push(`${field.label}: ${val}.`);
    }
  }
  const goal = extraValues["goal"];
  if (goal && goal !== "Выберите вариант") parts.push(apply(getDefaultPrompt(config!, "common", "goal"), String(goal)));

  const context = extraValues["context"];
  if (context) parts.push(apply(getDefaultPrompt(config!, "common", "context"), String(context)));

  const example = extraValues["example"];
  if (example) parts.push(apply(getDefaultPrompt(config!, "common", "example"), String(example)));

  return parts.filter((p, i, a) => p && a.indexOf(p) === i).join("\n"); 
}, [config, outputFormats, subOption, extraValues]);

const buildPrompt = useCallback((): string => {
  if (format === "staffing") {
    const fmt = outputFormats.find(f => f.id === "staffing");
    const sub = fmt?.subOptions?.find(s => s.label === subOption);
    const lines: string[] = [];

    lines.push(`Действуй как мировой эксперт McKinsey и Accenture по организационному дизайну в ${industry || "релевантной индустрии"}. Полагайся в ответах на лучшие передовые мировые практики`);
    lines.push("");
    lines.push("Твоя задача:");
    lines.push("");
    lines.push("Внимательно проанализируй данные о компании.");
    lines.push("");
    lines.push(`Определи целевую численность сотрудников в функции ${subOption || "организационной функции"} с учетом характеристик, указанными ниже. Изучи введённые данные до конца.`);
    lines.push("Предложи распределение по ролям с учетом их грейдов.");
    lines.push("Предоставь лаконичное (до 100 символов) обоснование расчёта для каждой ячейки данных.");
    lines.push("Укажи целевую численность в разрезе ролей в таблице и приоритезируй внедрение.");
    lines.push("");

    const fields = sub?.fields ?? [];
    if (fields.length) {
      lines.push("Характеристики организации (ввод пользователя):");
      for (const f of fields) {
        const v = extraValues[f.id];
        lines.push(`- ${f.label}: ${v && String(v).trim() ? v : "(не указано)"}`);
      }
      lines.push("");
    }

    lines.push("Требования к анализу:");
    lines.push("- Используй только проверенные данные и авторитетные бенчмарки (Gartner и др.), учитывай размер компании.");
    lines.push("- Не додумывай факты — если данных не хватает, сначала запроси уточнение у пользователя.");
    lines.push("- Если есть регуляторные требования — учти их.");
    lines.push("");
    lines.push("По итогу:");
    lines.push("- Предоставь итоговую таблицу с ролями, грейдами и численностью, с обоснованиями (до 100 символов).");
    return lines.join("\n");
  }


  // Общий путь для прочих форматов:
  const lines: string[] = [];

  // Роль/индустрия
  lines.push(buildRolePrompt());
  lines.push("");

  // Исключения
  if (exclusions.length) {
    lines.push(`Исключения: строго избегай ${exclusions.join(", ")}.`);
    lines.push("");
  }

  // Что нужно сделать
  if (userTask && userTask.trim()) {
    lines.push("Твоя задача:");
    lines.push(userTask.trim());
    lines.push("");
  }

  // Инструкция по формату (из config.json)
  lines.push(buildFormatInstruction(format));

  // COMMON поля (goal/context/constraints/example) — из config.common.fields
  const commons = config?.common?.fields ?? [];
  for (const f of commons) {
    const val = extraValues[f.id];

    // --- ВАЖНО: включаем ТОЛЬКО если пользователь явно задал значение ---
    const hasUserValue =
      f.type === "boolean"
        ? val === true
        : f.type === "list"
          ? nonEmpty(val) && val !== "Выберите вариант"
          : /* text/other */ nonEmpty(val);

    if (!hasUserValue) {
      // Никаких дефолтов/статик — вообще ничего не добавляем
      continue;
    }

    if (f.type === "boolean") {
      // сюда попадём только при true
      const t = apply(f.promptTemplate, "да");
      if (t) lines.push(t);
      else lines.push(`${f.label}: да.`);
      continue;
    }

    if (f.type === "list") {
      // если есть item-подсказка — используем её
      const item = f.items?.find(i => i.value === val);
      const t = item && config ? getPromptFromSelection(config, "common", f.id, String(val)) : undefined;
      if (t) {
        lines.push(t);
      } else {
        // иначе fallback к шаблону поля/метке
        const tpl = f.promptTemplate || "";
        if (hasValuePlaceholder(tpl)) lines.push(apply(tpl, String(val)));
        else if (tpl.trim()) lines.push(tpl);
        else lines.push(`${f.label}: ${val}.`);
      }
      continue;
    }

    // TEXT
    const tpl = f.promptTemplate || "";
    if (hasValuePlaceholder(tpl)) {
      lines.push(apply(tpl, String(val)));
    } else if (tpl.trim().length > 0) {
      lines.push(tpl);
      lines.push(`${f.label}: ${val}.`);
    } else {
      lines.push(`${f.label}: ${val}.`);
    }
  }

  // Уточнение
  if (refine && refine.trim()) {
    lines.push("");
    lines.push(`Уточнение: ${refine.trim()}.`);
  }
  return lines.join("\n");
}, [config, format, subOption, industry, extraValues, refine, buildRolePrompt, exclusions, buildFormatInstruction, userTask, outputFormats]);


  const handleCopy = useCallback(async (text?: string) => {
    try {
      const toCopy = typeof text === "string" ? text : generatedPrompt || "";
      if (!toCopy) return;
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("Ошибка при копировании:", e);
    }
  }, [generatedPrompt]);

  // hooks/usePromptBuilder.ts (ДОБАВЛЯЕМ ДЛЯ ОТЛАДКИ)
const handleGenerate = useCallback(() => {
  console.log('=== DEBUG INFORMATION ===');
  console.log('Format:', format);
  console.log('SubOption:', subOption);
  console.log('Industry:', industry);
  console.log('Experts:', experts);
  console.log('ExtraValues:', extraValues);
  console.log('UserTask:', userTask);
  
  const p = buildPrompt();
  
  console.log('Generated Prompt:', p);
  console.log('================');
  
  setGeneratedPrompt(p);
  setCopied(false);
  handleCopy(p);
}, [buildPrompt, handleCopy, format, subOption, industry, experts, extraValues, userTask]);

// --- setExtraValue: сохраняем и raw, и normalized ключ ---
const setExtraValue = useCallback((fieldId: string, value: FieldValue) => {
  setExtraValues(prev => {
    const next = { ...prev, [fieldId]: value };

    // normalized: если fieldId не содержит "_", добавляем префикс формата
    const normalized = fieldId.includes("_") ? fieldId : `${format}_${fieldId}`;
    next[normalized] = value;

    // если fieldId содержит префикс, добавим короткую версию без префикса
    if (fieldId.includes("_")) {
      const withoutPrefix = fieldId.split("_").slice(1).join("_");
      if (withoutPrefix) next[withoutPrefix] = value;
    }

    console.log("🔁 setExtraValue stored:", { fieldId, normalized, value });
    return next;
  });
}, [format]);


  useEffect(() => {
    setExperts([]);
  }, [industry]);

  useEffect(() => {
    if (!config) return;
    const firstFormat = config.formats[0]?.id ?? "text";
    setFormat(firstFormat);
    setSubOption("");
    setExtraValues({});
  }, [config]);

  useEffect(() => {
    // при смене формата сбрасываем подопцию и дополнительные значения
    setSubOption("");
    setExtraValues({});
    console.log('🔄 format changed, cleared subOption and extraValues. New format:', format);
  }, [format, setSubOption]);

  return {
    industry,
    setIndustry,
    experts,
    setExperts,
    userTask,
    setUserTask,
    format,
    setFormat,
    subOption,
    setSubOption,
    exclusionInput,
    setExclusionInput,
    exclusions,
    addExclusion,
    removeExclusion,
    generatedPrompt,
    setGeneratedPrompt,
    refine,
    setRefine,
    copied,
    setCopied,
    extraValues,
    setExtraValue,
    currentIndustryExperts,
    outputFormats,
    buildPrompt,
    handleCopy,
    handleGenerate,
  };
};

