// components/ConfigEditor.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { AppConfig, Industry, Format, SubOption, ExtraField, ExtraFieldItem } from "@/lib/config";

export default function ConfigEditor() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeFormatId, setActiveFormatId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/config", { cache: "no-store" });
      const data = await res.json();
      setCfg(data);
      setActiveFormatId(data?.formats?.[0]?.id ?? null);
    })();
  }, []);

  // --- Formats ---
  function addFormat() {
    if (!cfg) return;
    const newFormat: Format = {
      id: `fmt_${Date.now()}`,
      label: "Новый формат",
      subOptionsLabel: "Подварианты",
      subOptions: [],
      extraFields: []
    };
    setCfg({ ...cfg, formats: [...cfg.formats, newFormat] });
    setActiveFormatId(newFormat.id);
  }

  function removeFormat(idx: number) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    formats.splice(idx, 1);
    setCfg({ ...cfg, formats });
    setActiveFormatId(formats[0]?.id ?? null);
  }

  function updateFormat(idx: number, patch: Partial<Format>) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    formats[idx] = { ...formats[idx], ...patch };
    setCfg({ ...cfg, formats });
  }

  // SubOptions (label + promptTemplate)
  function addSubOption(formatIdx: number) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    formats[formatIdx].subOptions.push({ label: "Новый вариант", promptTemplate: "" });
    setCfg({ ...cfg, formats });
  }
  function updateSubOption(formatIdx: number, subIdx: number, patch: Partial<SubOption>) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    formats[formatIdx].subOptions[subIdx] = { ...formats[formatIdx].subOptions[subIdx], ...patch };
    setCfg({ ...cfg, formats });
  }
  function removeSubOption(formatIdx: number, subIdx: number) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    formats[formatIdx].subOptions.splice(subIdx, 1);
    setCfg({ ...cfg, formats });
  }

  // Extra fields (definition and items)
  function addExtraField(formatIdx: number) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    const newField: ExtraField = {
      id: `fld_${Date.now()}`,
      label: "Новое поле",
      type: "list",
      promptTemplate: "",
      items: []
    };
    formats[formatIdx].extraFields = formats[formatIdx].extraFields || [];
    formats[formatIdx].extraFields!.push(newField);
    setCfg({ ...cfg, formats });
  }

  function updateExtraFieldDef(formatIdx: number, fieldIdx: number, patch: Partial<ExtraField>) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    const fld = formats[formatIdx].extraFields![fieldIdx];
    formats[formatIdx].extraFields![fieldIdx] = { ...fld, ...patch };
    setCfg({ ...cfg, formats });
  }

  function removeExtraField(formatIdx: number, fieldIdx: number) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    formats[formatIdx].extraFields!.splice(fieldIdx, 1);
    setCfg({ ...cfg, formats });
  }

  // items within extraField (for type=list)
  function addExtraFieldItem(formatIdx: number, fieldIdx: number) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    const field = formats[formatIdx].extraFields![fieldIdx];
    field.items = field.items || [];
    field.items.push({ value: "", promptTemplate: "" });
    setCfg({ ...cfg, formats });
  }
  function updateExtraFieldItem(formatIdx: number, fieldIdx: number, itemIdx: number, patch: Partial<ExtraFieldItem>) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    const items = formats[formatIdx].extraFields![fieldIdx].items!;
    items[itemIdx] = { ...items[itemIdx], ...patch };
    setCfg({ ...cfg, formats });
  }
  function removeExtraFieldItem(formatIdx: number, fieldIdx: number, itemIdx: number) {
    if (!cfg) return;
    const formats = [...cfg.formats];
    formats[formatIdx].extraFields![fieldIdx].items!.splice(itemIdx, 1);
    setCfg({ ...cfg, formats });
  }

  // --- INDUSTRIES & EXPERTS ---
  function addIndustry() {
    if (!cfg) return;
    setCfg({ ...cfg, industries: [...cfg.industries, { name: "", promptTemplate: "", experts: [] }] });
  }
  function removeIndustry(idx: number) {
    if (!cfg) return;
    const industries = [...cfg.industries];
    industries.splice(idx, 1);
    setCfg({ ...cfg, industries });
  }
  function updateIndustry(idx: number, patch: Partial<Industry>) {
    if (!cfg) return;
    const industries = [...cfg.industries];
    industries[idx] = { ...industries[idx], ...patch };
    setCfg({ ...cfg, industries });
  }
  function addExpert(i: number) {
    if (!cfg) return;
    const industries = [...cfg.industries];
    industries[i].experts.push({ name: "", promptTemplate: "" });
    setCfg({ ...cfg, industries });
  }
  function removeExpert(i: number, j: number) {
    if (!cfg) return;
    const industries = [...cfg.industries];
    industries[i].experts.splice(j, 1);
    setCfg({ ...cfg, industries });
  }
  function updateExpert(i: number, j: number, patch: Partial<{ name: string; promptTemplate?: string }>) {
    if (!cfg) return;
    const industries = [...cfg.industries];
    industries[i].experts[j] = { ...industries[i].experts[j], ...patch };
    setCfg({ ...cfg, industries });
  }

  // --- SAVE ---
  async function save() {
    if (!cfg) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) return <div className="text-sm text-gray-600">Загрузка…</div>;

  const activeFormatIdx = cfg.formats.findIndex((f) => f.id === activeFormatId);
  const activeFormat = activeFormatIdx >= 0 ? cfg.formats[activeFormatIdx] : null;

  return (
    <div className="space-y-8">
      {/* FORMATS selection */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Форматы ответа</h2>
          <div className="flex gap-2">
            <button onClick={addFormat} className="rounded-xl bg-black px-3 py-1 text-white">+ Добавить формат</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          {cfg.formats.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFormatId(f.id)}
              className={`rounded-2xl border px-4 py-2 text-sm ${activeFormatId === f.id ? "bg-black text-white" : "bg-gray-100"}`}
            >
              {f.label || f.id}
            </button>
          ))}
        </div>

        {activeFormat && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex gap-2">
              <input
                value={activeFormat.label}
                onChange={(e) => updateFormat(activeFormatIdx, { label: e.target.value })}
                className="rounded-xl border px-2 py-1 flex-1"
                placeholder="Название формата"
              />
              <input
                value={activeFormat.id}
                onChange={(e) => updateFormat(activeFormatIdx, { id: e.target.value })}
                className="rounded-xl border px-2 py-1 w-48"
                placeholder="ID (латиницей)"
              />
              <input
                value={activeFormat.subOptionsLabel || ""}
                onChange={(e) => updateFormat(activeFormatIdx, { subOptionsLabel: e.target.value })}
                className="rounded-xl border px-2 py-1 w-48"
                placeholder="Заголовок подвариантов"
              />
              <button onClick={() => removeFormat(activeFormatIdx)} className="rounded-lg border px-2 py-1 text-sm text-red-600">Удалить</button>
            </div>

            {/* subOptions */}
            <section className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">Подварианты ({activeFormat.subOptionsLabel || "Подварианты"})</h3>
                <button onClick={() => addSubOption(activeFormatIdx)} className="rounded-lg border px-2 py-1 text-sm">+ Подвариант</button>
              </div>
              <div className="flex flex-col gap-2">
                {activeFormat.subOptions.map((s, si) => (
                  <div key={si} className="flex gap-2 items-start">
                    <input
                      value={s.label}
                      onChange={(e) => updateSubOption(activeFormatIdx, si, { label: e.target.value })}
                      className="rounded-xl border px-2 py-1 flex-1"
                    />
                    <input
                      value={s.promptTemplate || ""}
                      onChange={(e) => updateSubOption(activeFormatIdx, si, { promptTemplate: e.target.value })}
                      placeholder="Template для этого варианта (используйте {{value}}/{{subOption}})"
                      className="rounded-xl border px-2 py-1 flex-1"
                    />
                    <button onClick={() => removeSubOption(activeFormatIdx, si)} className="text-gray-500 hover:text-gray-900">×</button>
                  </div>
                ))}
              </div>
            </section>

            {/* extraFields */}
            <section className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">Доп. поля формата (extraFields)</h3>
                <button onClick={() => addExtraField(activeFormatIdx)} className="rounded-lg border px-2 py-1 text-sm">+ Поле</button>
              </div>
              <div className="flex flex-col gap-3">
                {(activeFormat.extraFields || []).map((fld, fi) => (
                  <div key={fld.id} className="rounded-lg border p-3">
                    <div className="flex gap-2 items-center mb-2">
                      <input value={fld.label} onChange={(e) => updateExtraFieldDef(activeFormatIdx, fi, { label: e.target.value })} className="rounded-xl border px-2 py-1 flex-1" />
                      <input value={fld.id} onChange={(e) => updateExtraFieldDef(activeFormatIdx, fi, { id: e.target.value })} className="rounded-xl border px-2 py-1 w-48" />
                      <select value={fld.type} onChange={(e) => updateExtraFieldDef(activeFormatIdx, fi, { type: e.target.value as ExtraField["type"] })} className="rounded-xl border px-2 py-1 w-40">
                        <option value="list">list</option>
                        <option value="text">text</option>
                        <option value="boolean">boolean</option>
                      </select>
                      <button onClick={() => removeExtraField(activeFormatIdx, fi)} className="text-red-600">Удалить</button>
                    </div>

                    <div className="mb-2">
                      <label className="text-sm text-gray-600">Prompt шаблон для поля (используйте {'{{value}}'})</label>
                      <input value={fld.promptTemplate || ""} onChange={(e) => updateExtraFieldDef(activeFormatIdx, fi, { promptTemplate: e.target.value })} className="rounded-xl border px-2 py-1 w-full mt-1" />
                    </div>

                    {fld.type === "list" && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-700">Элементы списка</div>
                          <button onClick={() => addExtraFieldItem(activeFormatIdx, fi)} className="rounded-lg border px-2 py-1 text-sm">+ Элемент</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(fld.items || []).map((it, ii) => (
                            <div key={ii} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1 text-sm">
                              <input value={it.value} onChange={(e) => updateExtraFieldItem(activeFormatIdx, fi, ii, { value: e.target.value })} className="rounded-full border px-2 py-1" />
                              <input value={it.promptTemplate || ""} onChange={(e) => updateExtraFieldItem(activeFormatIdx, fi, ii, { promptTemplate: e.target.value })} placeholder="promptTemplate" className="rounded-full border px-2 py-1 w-64" />
                              <button onClick={() => removeExtraFieldItem(activeFormatIdx, fi, ii)} className="text-gray-500 hover:text-gray-900">×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>

      {/* INDUSTRIES */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Отрасли и эксперты</h2>
          <div>
            <button onClick={addIndustry} className="rounded-xl bg-black px-3 py-1 text-white">+ Добавить отрасль</button>
          </div>
        </div>

        <div className="space-y-4">
          {cfg.industries.map((ind, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="mb-2 flex gap-2 items-center">
                <input value={ind.name} onChange={(e) => updateIndustry(i, { name: e.target.value })} className="rounded-xl border px-3 py-1 flex-1" placeholder="Название отрасли" />
                <input value={ind.promptTemplate || ""} onChange={(e) => updateIndustry(i, { promptTemplate: e.target.value })} placeholder="Template для индустрии (используйте {{experts}} и {{industry}})" className="rounded-xl border px-3 py-1 w-96" />
                <button onClick={() => removeIndustry(i)} className="rounded-lg border px-2 py-1 text-sm text-red-600">Удалить</button>
              </div>

              <div className="flex gap-2 items-center mb-2">
                <div className="text-sm font-medium">Эксперты</div>
                <button onClick={() => addExpert(i)} className="rounded-lg border px-2 py-1 text-sm">+ Эксперт</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {ind.experts.map((ex, j) => (
                  <div key={j} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1 text-sm">
                    <input value={ex.name} onChange={(e) => updateExpert(i, j, { name: e.target.value })} className="rounded-full border px-2 py-1" placeholder="Имя эксперта" />
                    <input value={ex.promptTemplate || ""} onChange={(e) => updateExpert(i, j, { promptTemplate: e.target.value })} placeholder="Template для эксперта (используйте {{expert}})" className="rounded-full border px-2 py-1 w-64" />
                    <button onClick={() => removeExpert(i, j)} className="text-gray-500 hover:text-gray-900">×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button disabled={saving} onClick={save} className="rounded-xl bg-black px-4 py-2 text-white">
          {saving ? "Сохранение…" : "Сохранить изменения"}
        </button>
        {success && <span className="text-sm text-green-600">Сохранено ✓</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
