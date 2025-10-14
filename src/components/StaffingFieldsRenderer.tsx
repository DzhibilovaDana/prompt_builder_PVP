// src/components/StaffingFieldsRenderer.tsx
import React from "react";
import type { Format } from "@/lib/config";

interface Props {
  format: string;
  subOption: string;
  formats: Format[];
  values: Record<string, any>;
  onValueChange: (fieldId: string, value: any) => void;
}

export const StaffingFieldsRenderer: React.FC<Props> = ({
  format, subOption, formats, values, onValueChange,
}) => {
  if (format !== "staffing") return null;
  const staffing = formats.find(f => f.id === "staffing");
  const sub = staffing?.subOptions.find(s => s.label === subOption);
  const fields = sub?.fields ?? [];
  if (!fields.length) return null;

  return (
    <div className="mt-4 space-y-4">
      {fields.map(field => (
        <div key={field.id}>
          <label className="mb-1 block text-sm font-medium">{field.label}</label>
          {field.hint && <span className="block text-xs text-gray-500 mt-0.5">{field.hint}</span>}
          <input
            type="text"
            className="w-full rounded-xl border px-3 py-2"
            value={values[field.id] || ""}
            onChange={(e) => onValueChange(field.id, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
};
