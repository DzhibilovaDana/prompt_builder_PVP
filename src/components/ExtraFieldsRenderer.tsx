// src/components/ExtraFieldsRenderer.tsx
import React from "react";
import type { Format } from "@/lib/config";
import { SELECT_PLACEHOLDER } from "@/lib/constants";

interface ExtraFieldsRendererProps {
  format: string;
  formats: Format[];
  values: Record<string, unknown>;
  onValueChange: (fieldId: string, value: string | boolean) => void;
}

export const ExtraFieldsRenderer: React.FC<ExtraFieldsRendererProps> = ({
  format,
  formats,
  values,
  onValueChange,
}) => {
  const fmt = formats.find(f => f.id === format);
  const fields = fmt?.extraFields ?? [];
  if (!fields.length) return null;

  return (
    <>
      {fields.map(field => {
        const rawValue = values[field.id];
        const value = typeof rawValue === "string" || typeof rawValue === "boolean" ? rawValue : "";
        return (
          <div key={field.id} className="mt-4">
            <label className="mb-1 block text-sm font-medium">{field.label}</label>
            {field.type === "list" ? (
              <select
                value={typeof value === "string" && value ? value : SELECT_PLACEHOLDER}
                onChange={(e) => onValueChange(field.id, e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
              >
                <option value={SELECT_PLACEHOLDER}>{SELECT_PLACEHOLDER}</option>
                {(field.items ?? []).map(it => (
                  <option key={it.value} value={it.value}>{it.value}</option>
                ))}
              </select>
            ) : field.type === "boolean" ? (
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => onValueChange(field.id, e.target.checked)}
                className="rounded"
                />
            ) : (
              <input
                type="text"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onValueChange(field.id, e.target.value)}
                placeholder={field.hint || ""}
                className="w-full rounded-xl border px-3 py-2"
                />
            )}
          </div>
        );
      })}
    </>
  );
};
