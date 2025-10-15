// app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { usePromptBuilder } from "@/hooks/usePromptBuilder";
import { Header } from "@/components/Header";
import { FormatSelector } from "@/components/FormatSelector";
import { IndustryExpertSelector } from "@/components/IndustryExpertSelector";
import { SubOptionsRenderer } from "@/components/SubOptionsRenderer";
import { ExtraFieldsRenderer } from "@/components/ExtraFieldsRenderer";
import { StaffingFieldsRenderer } from "@/components/StaffingFieldsRenderer";
import { CommonFieldsRenderer } from "@/components/CommonFieldsRenderer";
import { ExclusionsRenderer } from "@/components/ExclusionsRenderer";
import { UserTaskRenderer } from "@/components/UserTaskRenderer";
import { ActionButtons } from "@/components/ActionButtons";
import { PromptResult } from "@/components/PromptResult";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import type { AppConfig } from "@/lib/config";

/* почитать как корректно разместить это на гите
сборка на гит почитать
разделение данных и кода
формат презентации
множественный выбор в ограничениях*/

export default function PromptBuilderPrototype() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loadingCfg, setLoadingCfg] = useState(true);

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
    handleGenerate,
  } = usePromptBuilder(config);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/config", { cache: "no-store" });
      const data = await res.json();
      setConfig(data);
      setLoadingCfg(false);
    })();
  }, []);

  if (loadingCfg) return <div className="p-6 text-sm text-gray-600">Загрузка конфигурации…</div>;
  if (!config) return <div className="p-6 text-sm text-red-600">Не удалось загрузить конфигурацию.</div>;

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
            />

            <SubOptionsRenderer
              format={format}
              formats={outputFormats}
              subOption={subOption}
              onSubOptionChange={setSubOption}
            />

            <ExtraFieldsRenderer
              format={format}
              formats={outputFormats}
              values={extraValues}
              onValueChange={setExtraValue}
            />

            <StaffingFieldsRenderer
              format={format}
              subOption={subOption}
              formats={outputFormats}
              values={extraValues}
              onValueChange={setExtraValue}
            />

            <CommonFieldsRenderer
              values={extraValues}
              onValueChange={setExtraValue}
              show={["text", "table", "presentation", "code", "calculator"].includes(format)}
            />

            <ExclusionsRenderer
              exclusionInput={exclusionInput}
              onExclusionInputChange={setExclusionInput}
              exclusions={exclusions}
              onAddExclusion={addExclusion}
              onRemoveExclusion={removeExclusion}
              show={["text", "table", "presentation"].includes(format)}
            />

            <UserTaskRenderer
              userTask={userTask}
              onUserTaskChange={setUserTask}
            />

            <ActionButtons onGenerate={handleGenerate} />
          </div>

          <PromptResult
            generatedPrompt={generatedPrompt}
            copied={copied}
            onCopy={() => handleCopy()}
            refine={refine}
            onRefineChange={setRefine}
            onRefineApply={() => setGeneratedPrompt(buildPrompt())}
          />
        </section>

        <Sidebar />
      </main>

      <Footer />
    </div>
  );
}