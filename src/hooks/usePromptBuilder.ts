// src/hooks/usePromptBuilder.ts
import { useState, useCallback, useMemo, useEffect } from "react";
import type { AppConfig, Format, Industry } from "@/lib/config";
import { getDefaultSubOptionPrompt, getDefaultPrompt } from "@/lib/defaultPrompts";
import { getPromptFromSelection, getSubOptionPrompt } from "@/lib/promptTemplates";
import { SELECT_PLACEHOLDER } from "@/lib/constants";

type FieldValue = string | boolean | undefined;

const SELECTED_FORMAT_KEY = "prompt_builder_selected_format_v1";
const FORMAT_VALUES_KEY = "prompt_builder_format_values_v1";
const EXPERT_WEIGHTS_KEY = "prompt_builder_expert_weights_v1";

const apply = (tpl?: string, v?: string) => (tpl || "").replace(/\{\{\s*value\s*\}\}/g, v ?? "").trim();
const hasValuePlaceholder = (tpl?: string) => !!tpl && /\{\{\s*value\s*\}\}/i.test(tpl || "");
const nonEmpty = (v: unknown) => (typeof v === "string" ? v.trim().length > 0 : !!v);
const requiresUserInput = (field: { type?: string; promptTemplate?: string }) =>
  field?.type === "text" && hasValuePlaceholder(field?.promptTemplate || "");

/**
 * usePromptBuilder
 * - сохраняет/восстанавливает выбранный формат
 * - хранит значения полей per-format
 * - добавляет expertWeights (веса экспертов), сохраняет их в localStorage
 * - buildRolePrompt учитывает веса (сортировка по весу и замены {{weight}})
 */
export const usePromptBuilder = (config: AppConfig | null) => {
  const [industry, setIndustry] = useState<string>("");
  const [experts, setExpertsState] = useState<string[]>([]);
  const [userTask, setUserTask] = useState<string>("");

  const [format, setFormatState] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const s = localStorage.getItem(SELECTED_FORMAT_KEY);
        if (s) return s;
      }
    } catch {}
    return "text";
  });

  const [subOption, setSubOption] = useState<string>("");

  const [exclusionInput, setExclusionInput] = useState<string>("");
  const [exclusions, setExclusions] = useState<string[]>([]);

  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [refine, setRefine] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const [extraValues, setExtraValues] = useState<Record<string, FieldValue>>({});
  const [formatValues, setFormatValues] = useState<Record<string, Record<string, FieldValue>>>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(FORMAT_VALUES_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return {};
  });

  // expert weights
  const [expertWeights, setExpertWeightsState] = useState<Record<string, number>>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(EXPERT_WEIGHTS_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return {};
  });

  // current industry experts list
  const currentIndustryExperts = useMemo(() => {
    if (!config) return [];
    return config.industries.find((i) => i.name === industry)?.experts.map((e) => e.name) ?? [];
  }, [config, industry]);

  const outputFormats = useMemo<Format[]>(() => config?.formats ?? [], [config]);

  // restore extraValues when format changes
  useEffect(() => {
    try {
      const saved = formatValues[format];
      if (saved && typeof saved === "object") setExtraValues(saved);
      else setExtraValues({});
    } catch {
      setExtraValues({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  // When industry changes, remove selected experts that are not in current industry
  useEffect(() => {
    if (!industry) return;
    setExpertsState((prev) => {
      const allowed = currentIndustryExperts;
      const filtered = prev.filter((e) => allowed.includes(e));
      if (filtered.length !== prev.length) {
        // optionally remove weights for removed experts
        // but keep weights for other experts
      }
      return filtered;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry]);

  // persist helpers
  const persistFormatValues = useCallback((fv: Record<string, Record<string, FieldValue>>) => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(FORMAT_VALUES_KEY, JSON.stringify(fv));
    } catch {}
  }, []);

  const persistSelectedFormat = useCallback((fmt: string) => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(SELECTED_FORMAT_KEY, fmt);
    } catch {}
  }, []);

  const persistExpertWeights = useCallback((ew: Record<string, number>) => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(EXPERT_WEIGHTS_KEY, JSON.stringify(ew));
    } catch {}
  }, []);

  // setExtraValue: per-field setter and persist into formatValues[format]
  const setExtraValue = useCallback((fieldId: string, value: string | boolean) => {
    setExtraValues((prev) => {
      const next = { ...prev, [fieldId]: value };
      setFormatValues((prevFmt) => {
        const nextFmt = { ...prevFmt, [format]: next };
        persistFormatValues(nextFmt);
        return nextFmt;
      });
      return next;
    });
  }, [format, persistFormatValues]);

  // setFormat: save current extraValues into formatValues[oldFormat], persist selected format
  const setFormat = useCallback((newFormat: string) => {
    setFormatValues((prevFmt) => {
      const nextFmt = { ...prevFmt, [format]: { ...extraValues } };
      persistFormatValues(nextFmt);
      return nextFmt;
    });
    persistSelectedFormat(newFormat);
    setFormatState(newFormat);
    setSubOption("");
  }, [format, extraValues, persistFormatValues, persistSelectedFormat]);

  // expert weights API
  const setExpertWeight = useCallback((expertName: string, weight: number) => {
    setExpertWeightsState((prev) => {
      const next = { ...prev, [expertName]: Math.max(0, Math.min(100, Math.round(weight))) };
      persistExpertWeights(next);
      return next;
    });
  }, [persistExpertWeights]);

   // when adding/removing experts we should ensure default weight = 100 for new ones
  const setExperts = useCallback((nextExperts: string[]) => {
    setExpertsState(() => {
      // ensure each new expert has weight default 100
      // Use setExpertWeightsState(prevW => ...) so we operate on latest weights
      setExpertWeightsState((prevW) => {
        const nextW = { ...prevW };
        for (const a of nextExperts) {
          if (!(a in nextW)) nextW[a] = 100;
        }
        persistExpertWeights(nextW);
        return nextW;
      });
      return nextExperts;
    });
  }, [persistExpertWeights]);


  // add/remove exclusion helpers
  const addExclusion = useCallback(() => {
    const v = exclusionInput.trim();
    if (!v || exclusions.includes(v)) return;
    setExclusions((prev) => [...prev, v]);
    setExclusionInput("");
  }, [exclusionInput, exclusions]);

  const removeExclusion = useCallback((idx: number) => {
    setExclusions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // BUILD ROLE PROMPT — respect weights: sort by weight desc, replace {{expert}} and {{weight}}
    // BUILD ROLE PROMPT — respect weights: sort by weight desc, replace {{expert}} and {{weight}}
  const buildRolePrompt = useCallback((): string => {
    if (!config) return "Действуй как опытный специалист, способный решить поставленную задачу.";

    const ind: Industry | undefined = config.industries.find((i) => i.name === industry);
    const selectedExpertObjs = (ind?.experts || []).filter((e) => experts.includes(e.name));

    // sort selected experts by weight desc, fallback: preserve order in config
    selectedExpertObjs.sort((a, b) => {
      const wa = expertWeights[a.name] ?? 100;
      const wb = expertWeights[b.name] ?? 100;
      if (wa !== wb) return wb - wa; // higher weight first
      // tie-breaker: index in config list
      const ai = ind?.experts.findIndex((x) => x.name === a.name) ?? 0;
      const bi = ind?.experts.findIndex((x) => x.name === b.name) ?? 0;
      return ai - bi;
    });

    const expertFragments = selectedExpertObjs.map((e) => {
      const weight = expertWeights[e.name] ?? 100;
      const pct = `${weight}%`;

      if (e.promptTemplate) {
        // Replace placeholders (global)
        let tpl = String(e.promptTemplate);
        const hadWeightPlaceholder = /\{\{\s*weight\s*\}\}/i.test(tpl);
        tpl = tpl.replace(/\{\{\s*expert\s*\}\}/g, e.name);
        tpl = tpl.replace(/\{\{\s*weight\s*\}\}/g, pct);
        tpl = tpl.trim();

        // If the template did not include {{weight}} and weight != 100, append a concise weight marker
        if (!hadWeightPlaceholder && weight !== 100) {
          // append in a consistent, prompt-engineering friendly way
          // keep template punctuation: if it ends with '.' remove it before appending
          tpl = tpl.replace(/\.$/, "");
          tpl = `${tpl} (вес: ${pct})`;
        }

        return tpl;
      }

      // No template: return "Name (вес: X%)" only if weight differs from default
      return `${e.name}${weight !== 100 ? ` (вес: ${pct})` : ""}`;
    });

    // If we have industry and experts, prefer industry's promptTemplate if present
    if (industry && expertFragments.length > 0) {
      if (ind?.promptTemplate) {
        // Replace placeholders globally and add instruction about weights
        const base = String(ind.promptTemplate)
          .replace(/\{\{\s*experts\s*\}\}/g, expertFragments.join(", "))
          .replace(/\{\{\s*industry\s*\}\}/g, industry)
          .trim();

        // Add short guidance on weight interpretation for the model
        const weightGuidance = expertFragments.some(f => /\(вес: \d+%?\)/.test(f) || /\d+%/.test(f))
          ? " Учитывай указанные рядом проценты как относительную значимость мнений экспертов при формировании ответа."
          : " Учитывай относительную значимость экспертов при формировании ответа.";

        // Ensure base ends without redundant punctuation before appending guidance
        const baseClean = base.replace(/\s+$/, "");
        return (baseClean + (baseClean.endsWith(".") ? "" : ".") + weightGuidance).trim();
      }

      // No industry template — build a concise instruction
      const expertsList = expertFragments.join(", ");
      const role = `Действуй как команда экспертов: ${expertsList}.`;
      const guidance = "Учитывай указанные веса (проценты) как относительную важность вклада каждого эксперта при формировании ответа.";
      return `${role} ${guidance}`;
    }

    // If only industry chosen without specific experts
    if (industry) {
      return `Действуй как специалист с глубоким пониманием индустрии ${industry}. Используй отраслевые знания и проверенные практики.`;
    }

    // If no industry but some experts (should be covered above), else fallback
    if (expertFragments.length > 0) {
      const expertsList = expertFragments.join(", ");
      const role = `Действуй как ${expertsList}.`;
      const guidance = "Применяй профессиональный подход, учитывая относительную важность мнений (веса) экспертов.";
      return `${role} ${guidance}`;
    }

    // Default fallback
    return "Действуй как опытный профессионал, способный качественно решить поставленную задачу. Используй системный подход и проверенные методики.";
  }, [config, industry, experts, expertWeights]);


  // buildFormatInstruction and buildPrompt re-use previous logic (with SELECT_PLACEHOLDER)
  const buildFormatInstruction = useCallback((fmtId: string): string => {
    const fmt = outputFormats.find((f) => f.id === fmtId);
    if (!fmt) return "Формат ответа: ясный, структурированный текст.";

    const parts: string[] = [];
    parts.push(`Формат ответа: ${fmt.label}.`);

    if (subOption && subOption !== SELECT_PLACEHOLDER) {
      const t = getSubOptionPrompt(config!, fmtId, subOption);
      if (t) parts.push(t);
    } else {
      const d = getDefaultSubOptionPrompt(config!, fmtId);
      if (d) parts.push(d);
    }

    for (const field of fmt.extraFields ?? []) {
      const val = extraValues[field.id];

      if (field.type === "boolean") {
        if (val === true) {
          const t = apply(field.promptTemplate, "да");
          parts.push(t || `${field.label}: да.`);
        }
        continue;
      }

      if (!nonEmpty(val) || val === SELECT_PLACEHOLDER) {
        if (requiresUserInput(field)) continue;
        const def = getDefaultPrompt(config!, fmtId, field.id);
        if (def && def.trim()) parts.push(def);
        continue;
      }

      if (field.type === "list") {
        const item = field.items?.find(i => i.value === val);
        const t = item?.promptTemplate || apply(field.promptTemplate, String(val));
        parts.push(t || `${field.label}: ${val}.`);
        continue;
      }

      const tpl = field.promptTemplate || "";
      if (hasValuePlaceholder(tpl)) {
        if (nonEmpty(val)) parts.push(apply(tpl, String(val)));
      } else if (tpl.trim().length > 0) {
        parts.push(tpl);
        if (nonEmpty(val)) parts.push(`${field.label}: ${val}.`);
      } else {
        if (nonEmpty(val)) parts.push(`${field.label}: ${val}.`);
      }
    }

    const goal = extraValues["goal"];
    if (goal && goal !== SELECT_PLACEHOLDER) parts.push(apply(getDefaultPrompt(config!, "common", "goal"), String(goal)));

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

    const lines: string[] = [];
    lines.push(buildRolePrompt());
    lines.push("");

    if (exclusions.length) {
      lines.push(`Исключения: строго избегай ${exclusions.join(", ")}.`);
      lines.push("");
    }

    if (userTask && userTask.trim()) {
      lines.push("Твоя задача:");
      lines.push(userTask.trim());
      lines.push("");
    }

    lines.push(buildFormatInstruction(format));

    const commons = config?.common?.fields ?? [];
    for (const f of commons) {
      const val = extraValues[f.id];
      const hasUserValue =
        f.type === "boolean"
          ? val === true
          : f.type === "list"
            ? nonEmpty(val) && val !== SELECT_PLACEHOLDER
            : nonEmpty(val);

      if (!hasUserValue) continue;

      if (f.type === "boolean") {
        const t = apply(f.promptTemplate, "да");
        if (t) lines.push(t);
        else lines.push(`${f.label}: да.`);
        continue;
      }

      if (f.type === "list") {
        const item = f.items?.find(i => i.value === val);
        const t = item && config ? getPromptFromSelection(config, "common", f.id, String(val)) : undefined;
        if (t) {
          lines.push(t);
        } else {
          const tpl = f.promptTemplate || "";
          if (hasValuePlaceholder(tpl)) lines.push(apply(tpl, String(val)));
          else if (tpl.trim()) lines.push(tpl);
          else lines.push(`${f.label}: ${val}.`);
        }
        continue;
      }

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

  const handleGenerate = useCallback(() => {
    const p = buildPrompt();
    setGeneratedPrompt(p);
    handleCopy(p);
  }, [buildPrompt, handleCopy]);

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
    // new exports
    expertWeights,
    setExpertWeight,
  };
};
