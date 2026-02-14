// src/components/FormatSelector.tsx
import React, { KeyboardEvent, useRef } from "react";
import type { Format } from "@/lib/config";

interface FormatSelectorProps {
  formats: Format[];
  selectedFormat: string;
  onFormatChange: (format: string) => void;
}

/**
 * Доступный селектор форматов.
 * - role="radiogroup" для контейнера
 * - role="radio" + aria-checked для каждой опции
 * - keyboard navigation: Left/Right/Up/Down, Home/End
 */
export const FormatSelector: React.FC<FormatSelectorProps> = ({
  formats,
  selectedFormat,
  onFormatChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const focusButtonByIndex = (index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-format]'));
    const clamped = Math.max(0, Math.min(buttons.length - 1, index));
    const btn = buttons[clamped];
    if (btn) btn.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-format]'));
    const currentIndex = buttons.findIndex((b) => b.getAttribute("data-format") === selectedFormat);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIndex = currentIndex - 1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIndex = currentIndex + 1;
    if (e.key === "Home") nextIndex = 0;
    if (e.key === "End") nextIndex = buttons.length - 1;

    if (nextIndex < 0) nextIndex = buttons.length - 1;
    if (nextIndex >= buttons.length) nextIndex = 0;

    // фокусируем кнопку и меняем формат
    focusButtonByIndex(nextIndex);
    const nextFormat = buttons[nextIndex].getAttribute("data-format") || "";
    if (nextFormat) onFormatChange(nextFormat);
  };

  return (
    <div className="mt-4">
      <label className="mb-1 block text-sm font-medium">Формат ответа</label>
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Формат ответа"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-3"
      >
        {formats.map((f) => {
          const isSelected = selectedFormat === f.id;
          return (
            <button
              key={f.id}
              data-format={f.id}
              role="radio"
              aria-checked={isSelected}
              aria-label={f.label}
              onClick={() => onFormatChange(f.id)}
              onKeyDown={(e) => {
                // Enter и Space тоже должны выбирать
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onFormatChange(f.id);
                }
              }}
              className={`rounded-2xl border px-6 py-3 text-base font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isSelected ? "border-black bg-black text-white shadow-md" : "bg-gray-100 hover:bg-gray-200"
              }`}
              tabIndex={isSelected ? 0 : -1}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FormatSelector;
