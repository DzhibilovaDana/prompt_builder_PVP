// src/components/PromptBuilderClient.tsx
"use client";

import React, { Suspense, useState } from "react";
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
    { id: "openai", label: "OpenAI (gpt-4o)", description: "OpenAI GPT-4o (mock)" },
    { id: "claude", label: "Anthropic Claude", description: "Claude 3.5 (mock)" },
    { id: "local", label: "Local LLM", description: "Локальная модель (mock)" },
  ];
  const [selectedProviders, setSelectedProviders] = useState<string[]>(["openai"]);
  const [generateResults, setGenerateResults] = useState<Record<string, ProviderResult> | null>(null);
  const [genMode, setGenMode] = useState<"ok" | "degraded" | "error">("ok");
  const [generating, setGenerating] = useState(false);

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
        body: JSON.stringify({ prompt: p, providers: selectedProviders }),
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
        />
      </main>

      <footer>
        {/* existing Footer component (if stays named Footer) */}
      </footer>
    </div>
  );
};

export default PromptBuilderClient;
