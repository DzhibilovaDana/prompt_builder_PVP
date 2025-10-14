// components/ExclusionsRenderer.tsx
import React from "react";

interface ExclusionsRendererProps {
  exclusionInput: string;
  onExclusionInputChange: (value: string) => void;
  exclusions: string[];
  onAddExclusion: () => void;
  onRemoveExclusion: (index: number) => void;
  show: boolean;
}

export const ExclusionsRenderer: React.FC<ExclusionsRendererProps> = ({
  exclusionInput,
  onExclusionInputChange,
  exclusions,
  onAddExclusion,
  onRemoveExclusion,
  show,
}) => {
  if (!show) return null;

  return (
    <div className="mt-4">
      <label className="mb-1 block text-sm font-medium">Исключающие темы (через Enter)</label>
      <div className="flex gap-2">
        <input
          value={exclusionInput}
          onChange={(e) => onExclusionInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onAddExclusion(); }}
          placeholder="Напр.: упоминание конкурентов"
          className="w-full rounded-xl border px-3 py-2"
        />
        <button onClick={onAddExclusion} className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-white">+ Добавить</button>
      </div>
      {!!exclusions.length && (
        <div className="mt-2 flex flex-wrap gap-2">
          {exclusions.map((x, idx) => (
            <span key={`${x}-${idx}`} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm">
              {x}
              <button onClick={() => onRemoveExclusion(idx)} className="text-gray-500 hover:text-gray-900">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};