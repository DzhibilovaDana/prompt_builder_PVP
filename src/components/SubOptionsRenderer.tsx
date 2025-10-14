// components/SubOptionsRenderer.tsx
import React from "react";
import type { Format } from "@/lib/config";

interface SubOptionsRendererProps {
  format: string;
  formats: Format[];
  subOption: string;
  onSubOptionChange: (option: string) => void;
}

export const SubOptionsRenderer: React.FC<SubOptionsRendererProps> = ({
  format,
  formats,
  subOption,
  onSubOptionChange,
}) => {
  const fmt = formats.find((f) => f.id === format);
  if (!fmt || !fmt.subOptions?.length) return null;

  return (
    <div className="mt-2">
      <label className="mb-1 block text-sm font-medium">{fmt.subOptionsLabel}</label>
      <div className="flex flex-wrap gap-2">
        {fmt.subOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onSubOptionChange(opt.label)}
            className={`rounded-xl border px-3 py-1 text-sm ${subOption === opt.label ? "border-black bg-black text-white" : "bg-white hover:bg-gray-50"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};