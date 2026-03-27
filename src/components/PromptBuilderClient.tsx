// src/components/PromptBuilderClient.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePromptBuilder } from "@/hooks/usePromptBuilder";
import { useFavorites } from "@/hooks/useFavorites";
import { FavoritesList } from "@/components/FavoritesList";
import { Header } from "@/components/Header";
import FormatSelector from "@/components/FormatSelector";
import { IndustryExpertSelector } from "@/components/IndustryExpertSelector";
import ActionButtons from "@/components/ActionButtons";
import { PromptResult } from "@/components/PromptResult";
import Sidebar, { type ProviderInfo } from "@/components/Sidebar";
import ResultsPane, { type ProviderResult } from "@/components/ResultsPane";
import { UserTaskRenderer } from "@/components/UserTaskRenderer";
import type { AppConfig } from "@/lib/config";
import { exportPromptAsMarkdown, exportPromptAsHtml } from "@/lib/exportPrompt";


const SubOptionsRenderer = React.lazy(() => import("./SubOptionsRenderer").then((m) => ({ default: m.SubOptionsRenderer })));
const ExtraFieldsRenderer = React.lazy(() => import("./ExtraFieldsRenderer").then((m) => ({ default: m.ExtraFieldsRenderer })));
const StaffingFieldsRenderer = React.lazy(() => import("./StaffingFieldsRenderer").then((m) => ({ default: m.StaffingFieldsRenderer })));
const CommonFieldsRenderer = React.lazy(() => import("./CommonFieldsRenderer").then((m) => ({ default: m.CommonFieldsRenderer })));
const ExclusionsRenderer = React.lazy(() => import("./ExclusionsRenderer").then((m) => ({ default: m.ExclusionsRenderer })));

interface Props {
  config: AppConfig;
}

const TIPS_BANNER_STORAGE_KEY = "promptbuilder:tips:v1";
const PROVIDER_KEYS_STORAGE_KEY = "promptbuilder:provider-keys:v1";

type ProviderKeys = {
  openaiApiKey?: string;
  deepseekApiKey?: string;
  yandexApiKey?: string;
  yandexFolderId?: string;
  yandexModelUri?: string;
  anthropicApiKey?: string;
};

type ShareablePreset = {
  industry?: string;
  experts?: string[];
  format?: string;
  subOption?: string;
  userTask?: string;
  extraValues?: Record<string, string | boolean>;
};

type QuickStartTemplate = {
  id: string;
  title: string;
  task: string;
  industry?: string;
  experts?: string[];
  format?: string;
  subOption?: string;
  extraValues?: Record<string, string | boolean>;
};

const PRESET_QUERY_PARAM = "preset";
const SHARE_BASE_URL = "http://194.116.236.178:3000/";

const toBase64 = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const fromBase64 = (input: string): string => {
  const binary = atob(input);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const toBase64Url = (input: string): string => {
  const encoded = toBase64(input);
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (input: string): string => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return fromBase64(padded);
};

const encodePreset = (preset: ShareablePreset): string => toBase64Url(JSON.stringify(preset));

const decodePreset = (raw: string): ShareablePreset | null => {
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as ShareablePreset;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const PromptBuilderClient: React.FC<Props> = ({ config }) => {
    const {
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
    // new exports
    expertWeights,
    setExpertWeight,
    // handleGenerate, // we will call buildPrompt + API from here
  } = usePromptBuilder(config);


    const { favorites, addFavorite, removeFavorite } = useFavorites();


  // Provider selection state (defaults)
  const providersList: ProviderInfo[] = [
    { id: "openai", label: "OpenAI", description: "OpenAI GPT (API key required)" },
    { id: "deepseek", label: "DeepSeek", description: "DeepSeek Chat (API key required)" },
    { id: "yandex", label: "YandexGPT", description: "Yandex Foundation Models (API key required)" },
    { id: "claude", label: "Anthropic Claude", description: "Claude 3.5 (API key required)" },
  ];
  const [selectedProviders, setSelectedProviders] = useState<string[]>(["openai"]);
  const [providerKeys, setProviderKeys] = useState<ProviderKeys>({});
  const [generateResults, setGenerateResults] = useState<Record<string, ProviderResult> | null>(null);
  const [genMode, setGenMode] = useState<"ok" | "degraded" | "error">("ok");
  const [generating, setGenerating] = useState(false);
  const [showTipsBanner, setShowTipsBanner] = useState(false);
  const [presetCopied, setPresetCopied] = useState(false);
  const appliedPresetRef = useRef(false);
  const [pendingExtraValues, setPendingExtraValues] = useState<Record<string, string | boolean> | null>(null);

  useEffect(() => {
    try {
      const hidden = localStorage.getItem(TIPS_BANNER_STORAGE_KEY) === "hidden";
      if (!hidden) setShowTipsBanner(true);
    } catch {
      setShowTipsBanner(true);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROVIDER_KEYS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ProviderKeys;
      if (parsed && typeof parsed === "object") {
        setProviderKeys(parsed);
      }
    } catch {
      // ignore invalid local cache
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify(providerKeys));
    } catch {
      // ignore localStorage failures
    }
  }, [providerKeys]);

  const quickStartTemplates = useMemo<QuickStartTemplate[]>(() => {
    if (!industry) return [];
    return [
      {
        id: "roadmap-30",
        title: "План на 30 дней",
        industry,
        experts: currentIndustryExperts.slice(0, 2),
        task: `Составь практический 30-дневный план улучшений для команды в индустрии "${industry}" с приоритетами, KPI и рисками.`,
        format: "text",
        extraValues: {
          goal: "Получить практичный и реалистичный план внедрения на 30 дней",
          context: `Команда работает в индустрии ${industry}.`,
          text_structure: "Пошаговый план",
          text_style: "Профессиональный",
          text_length: "Развёрнуто",
        },
      },
      {
        id: "pilot-checklist",
        title: "Чек-лист пилота",
        industry,
        experts: currentIndustryExperts.slice(0, 2),
        task: `Подготовь чек-лист запуска пилота в индустрии "${industry}": шаги, ответственные, сроки и критерии успеха.`,
        format: "text",
        extraValues: {
          goal: "Быстро подготовить план запуска пилота без пропуска критичных шагов",
          text_structure: "Чек-лист",
          text_style: "Деловой",
          text_length: "Кратко",
        },
      },
    ];
  }, [currentIndustryExperts, industry]);

  const applyQuickStart = (tpl: QuickStartTemplate) => {
    if (tpl.industry) setIndustry(tpl.industry);
    if (Array.isArray(tpl.experts) && tpl.experts.length > 0) {
      setExperts(tpl.experts);
    }
    if (tpl.format && outputFormats.some((f) => f.id === tpl.format)) {
      setFormat(tpl.format);
    }
    if (tpl.subOption) {
      setSubOption(tpl.subOption);
    }
    if (tpl.extraValues) {
      setPendingExtraValues(tpl.extraValues);
    }
    setUserTask(tpl.task);
  };

  const copySharePresetLink = async () => {
    const preset: ShareablePreset = {
      industry: industry || undefined,
      experts: experts.length > 0 ? experts : undefined,
      format: format || undefined,
      subOption: subOption || undefined,
      userTask: userTask.trim() || undefined,
      extraValues: Object.fromEntries(
        Object.entries(extraValues).filter(([, value]) => typeof value === "string" || typeof value === "boolean")
      ) as Record<string, string | boolean>,
    };
    const encoded = encodePreset(preset);
    const url = new URL(SHARE_BASE_URL);
    url.searchParams.set(PRESET_QUERY_PARAM, encoded);

    try {
      await navigator.clipboard.writeText(url.toString());
      setPresetCopied(true);
      setTimeout(() => setPresetCopied(false), 1500);
    } catch {
      alert(`Не удалось скопировать автоматически. Ссылка:\n${url.toString()}`);
    }
  };

  useEffect(() => {
    if (appliedPresetRef.current) return;
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get(PRESET_QUERY_PARAM);
    if (!encoded) return;

    const parsed = decodePreset(encoded);
    if (!parsed) return;

    if (parsed.industry) setIndustry(parsed.industry);
    if (parsed.format && outputFormats.some((f) => f.id === parsed.format)) {
      setFormat(parsed.format);
    }
    if (parsed.subOption) setSubOption(parsed.subOption);
    if (parsed.userTask) setUserTask(parsed.userTask);
    if (Array.isArray(parsed.experts)) {
      setExperts(parsed.experts.filter((x): x is string => typeof x === "string"));
    }
    if (parsed.extraValues && typeof parsed.extraValues === "object") {
      setPendingExtraValues(parsed.extraValues);
    }

    appliedPresetRef.current = true;
  }, [outputFormats, setExperts, setFormat, setIndustry, setSubOption, setUserTask]);

  useEffect(() => {
    if (!pendingExtraValues) return;
    for (const [fieldId, value] of Object.entries(pendingExtraValues)) {
      if (typeof value === "string" || typeof value === "boolean") {
        setExtraValue(fieldId, value);
      }
    }
    setPendingExtraValues(null);
  }, [pendingExtraValues, setExtraValue]);

  const hideTipsBanner = () => {
    try {
      localStorage.setItem(TIPS_BANNER_STORAGE_KEY, "hidden");
    } catch {}
    setShowTipsBanner(false);
  };

  const handleExportMarkdown = () => {
    if (!generatedPrompt) return;
    exportPromptAsMarkdown(generatedPrompt);
  };

  const handleExportHtml = () => {
    if (!generatedPrompt) return;
    exportPromptAsHtml(generatedPrompt);
  };

  const handleAddFavorite = async () => {
    if (!generatedPrompt) return;

    const title = typeof userTask === "string" && userTask.trim().length > 0 ? userTask.trim() : "Промпт без названия";
    await addFavorite(generatedPrompt, title);
  };

  const handleUseFavorite = (prompt: string) => {
    setGeneratedPrompt(prompt);
    setRefine("");
    setCopied(false);
  };

    const handleShareFavorite = async (fav: { id: string; title: string; prompt: string }) => {
    try {
      // If already on server (numeric id) - copy
      if (/^\d+$/.test(String(fav.id))) {
        const url = `${location.origin}/api/prompts/${encodeURIComponent(fav.id)}`;
        try {
          await navigator.clipboard.writeText(url);
          alert("Ссылка скопирована в буфер обмена:\n" + url);
        } catch {
          // fallback text if clipboard fails
          alert("Не удалось скопировать ссылку. Вот ссылка:\n" + url);
        }
        return;
      }

      // Not on server: attempt to save via addFavorite (it will try server if possible)
      const created = await addFavorite(fav.prompt, fav.title);

      if (!created) {
        alert("Не удалось создать промпт на сервере. Промпт остался локальным.");
        return;
      }

      // If created has server-like id -> share it and remove old local entry
      if (/^\d+$/.test(String(created.id))) {
        // remove old local (if exists)
        if (fav.id && !/^\d+$/.test(String(fav.id))) {
          // best-effort remove local copy
          try {
            await removeFavorite(fav.id);
          } catch {
            // ignore
          }
        }

        const url = `${location.origin}/api/prompts/${encodeURIComponent(created.id)}`;
        try {
          await navigator.clipboard.writeText(url);
          alert("Промпт сохранён на сервере. Ссылка скопирована в буфер обмена:\n" + url);
        } catch {
          alert("Промпт сохранён на сервере. Вот ссылка:\n" + url);
        }
        return;
      }

      // created exists but is still local -> server unavailable
      alert("Промпт остался локальным (сервер недоступен). Попробуйте ещё раз, когда сервер будет доступен.");
    } catch (err: unknown) {
      alert("Ошибка при подготовке ссылки: " + getErrorMessage(err));
    }
  };


  // Generate and copy (local)
  const onGenerate = () => {
    const p = buildPrompt();
    setGeneratedPrompt(p);
    handleCopy(p);
  };

  // Send to LLMs
  const onSendToLLM = async () => {
    const p = buildPrompt();
    setGeneratedPrompt(p); // keep consistent
    setGenerating(true);
    setGenMode("ok");
    setGenerateResults(null);

    try {
      if (!selectedProviders || selectedProviders.length === 0) {
        // degrade
        setGenMode("degraded");
        setGenerateResults(null);
        setGenerating(false);
        return;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, providers: selectedProviders, providerKeys }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGenMode("error");
        setGenerateResults({ general: { status: "error", error: data?.error || "Server error" } });
        setGenerating(false);
        return;
      }

      if (data?.mode === "degraded") {
        setGenMode("degraded");
        setGenerateResults(null);
        setGenerating(false);
        return;
      }

      // data.results: Record<provider, ProviderResult>
      setGenMode("ok");
      setGenerateResults(data.results || null);
    } catch (e: unknown) {
      setGenMode("error");
      setGenerateResults({ general: { status: "error", error: e instanceof Error ? e.message : String(e) } });
    } finally {
      setGenerating(false);
    }
  };

  // onImportFavorites (used by FavoritesList)
  const onImportFavorites = async (items: { title: string; prompt: string }[]) => {
    for (const it of items) {
      await addFavorite(it.prompt, it.title);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <Header />

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Конструктор промпта</h2>

            {showTipsBanner ? (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">С чего начать</p>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Выберите формат и индустрию</li>
                      <li>Заполните задачу и контекст</li>
                      <li>Нажмите Generate или Send to LLM</li>
                    </ul>
                  </div>
                  <button
                    onClick={hideTipsBanner}
                    className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    aria-label="Скрыть подсказки"
                  >
                    скрыть
                  </button>
                </div>
              </div>
            ) : null}
 <details className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-emerald-900">
                Быстрый старт по индустрии
              </summary>
              <div className="mt-3 space-y-2">
                {industry ? (
                  quickStartTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyQuickStart(tpl)}
                      className="block w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left text-sm hover:bg-emerald-100"
                    >
                      <div className="font-medium">{tpl.title}</div>
                      <div className="text-xs text-gray-600">{tpl.task}</div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-emerald-900">Сначала выберите индустрию — и здесь появятся шаблоны на 1 клик.</p>
                )}
              </div>
            </details>

            <FormatSelector
              formats={config.formats}
              selectedFormat={format}
              onFormatChange={setFormat}
            />

            <IndustryExpertSelector
                industries={config.industries}
                industry={industry}
                onIndustryChange={setIndustry}
                experts={experts}
                onExpertsChange={setExperts}
                currentIndustryExperts={currentIndustryExperts}
                show={["text", "table", "presentation", "code", "calculator"].includes(format)}
                expertWeights={expertWeights}
                onExpertWeightChange={setExpertWeight}
            />


            

            <Suspense fallback={<div className="mt-2 text-sm text-gray-500">Загрузка опций...</div>}>
              <SubOptionsRenderer
                format={format}
                formats={outputFormats}
                subOption={subOption}
                onSubOptionChange={setSubOption}
              />
            </Suspense>

            <Suspense fallback={<div className="mt-2 text-sm text-gray-500">Загрузка полей...</div>}>
              <ExtraFieldsRenderer
                format={format}
                formats={outputFormats}
                values={extraValues}
                onValueChange={setExtraValue}
              />
            </Suspense>

            <Suspense fallback={null}>
              <StaffingFieldsRenderer
                format={format}
                subOption={subOption}
                formats={outputFormats}
                values={extraValues}
                onValueChange={(id, val) => setExtraValue(id, val)}
              />
            </Suspense>

            <Suspense fallback={null}>
              <CommonFieldsRenderer
                values={extraValues}
                onValueChange={(id, val) => setExtraValue(id, val)}
                show={["text", "table", "presentation", "code", "calculator"].includes(format)}
              />
            </Suspense>

            <Suspense fallback={null}>
              <ExclusionsRenderer
                exclusionInput={exclusionInput}
                onExclusionInputChange={setExclusionInput}
                exclusions={exclusions}
                onAddExclusion={addExclusion}
                onRemoveExclusion={removeExclusion}
                show={["text", "table", "presentation"].includes(format)}
              />
            </Suspense>

            <UserTaskRenderer userTask={userTask} onUserTaskChange={setUserTask} />

            <ActionButtons onSendToLLM={onSendToLLM} onGenerate={onGenerate} disabled={generating} />
          </div>

          <PromptResult
            generatedPrompt={generatedPrompt}
            copied={copied}
            onCopy={() => handleCopy()}
            refine={refine}
            onRefineChange={setRefine}
            onRefineApply={() => setGeneratedPrompt(buildPrompt())}
            onExportMarkdown={handleExportMarkdown}
            onExportHtml={handleExportHtml}
            onAddFavorite={handleAddFavorite}
          />

          {/* Results pane shows provider outputs or degraded banner */}
          <ResultsPane results={generateResults} mode={genMode} />

          <FavoritesList
            favorites={favorites}
            onUseFavorite={handleUseFavorite}
            onDeleteFavorite={removeFavorite}
            onImportFavorites={onImportFavorites}
            onShareFavorite={handleShareFavorite}
        />
        </section>

        {/* pass provider selection props to Sidebar */}
        <Sidebar
          availableProviders={providersList}
          selectedProviders={selectedProviders}
          onProvidersChange={setSelectedProviders}
          providerKeys={providerKeys}
          onProviderKeysChange={setProviderKeys}
          onSharePreset={copySharePresetLink}
          presetCopied={presetCopied}
        />
      </main>

      <footer>
        {/* existing Footer component (if stays named Footer) */}
      </footer>
    </div>
  );
};

export default PromptBuilderClient;
