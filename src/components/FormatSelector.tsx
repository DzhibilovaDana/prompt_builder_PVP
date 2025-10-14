// components/FormatSelector.tsx
import React from "react";
import type { Format } from "@/lib/config";

interface FormatSelectorProps {
  formats: Format[];
  selectedFormat: string;
  onFormatChange: (format: string) => void;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  formats,
  selectedFormat,
  onFormatChange,
}) => {
  return (
    <div className="mt-4">
      <label className="mb-1 block text-sm font-medium">Формат ответа</label>
      <div className="flex flex-wrap gap-3">
        {formats.map((f) => (
          <button
            key={f.id}
            onClick={() => onFormatChange(f.id)}
            className={`rounded-2xl border px-6 py-3 text-base font-medium shadow-sm transition ${selectedFormat === f.id ? "border-black bg-black text-white shadow-md" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
};