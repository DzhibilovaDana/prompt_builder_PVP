// components/CommonFieldsRenderer.tsx
import React from "react";

interface CommonFieldsRendererProps {
  values: Record<string, unknown>;
  onValueChange: (fieldId: string, value: string) => void;
  show: boolean;
}

export const CommonFieldsRenderer: React.FC<CommonFieldsRendererProps> = ({
  values,
  onValueChange,
  show,
}) => {
  if (!show) return null;

  const goalOptions = [
    "Информировать",
    "Объяснить",
    "Убедить",
    "Вдохновить",
    "Обучить",
    "Развлечь",
    "Мотивировать",
    "Предупредить",
    "Рекомендовать"
  ];

  const constraintOptions = [
    "Не использовать жаргон",
    "Максимум 1000 символов",
    "Максимум 500 символов",
    "Только факты",
    "Без эмоциональных оценок",
    "Простыми словами",
    "Для широкой аудитории",
    "Для экспертов в области"
  ];

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Цель / намерение</label>
        <select
          value={typeof values["goal"] === "string" ? values["goal"] : ""}
          onChange={(e) => onValueChange("goal", e.target.value)}
          className="w-full rounded-xl border px-3 py-2"
        >
          <option value="Выберите вариант">Выберите цель</option>
          {goalOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Контекст / фоновые данные</label>
        <textarea
          rows={3}
          className="w-full resize-y rounded-xl border px-3 py-2"
          placeholder="Предыстория, ограничения, целевая аудитория, доменная специфика..."
          value={typeof values["context"] === "string" ? values["context"] : ""}
          onChange={(e) => onValueChange("context", e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Ограничения</label>
        <select
          value={typeof values["constraints"] === "string" ? values["constraints"] : ""}
          onChange={(e) => onValueChange("constraints", e.target.value)}
          className="w-full rounded-xl border px-3 py-2"
        >
          <option value="Выберите вариант">Выберите ограничение</option>
          {constraintOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Пример</label>
        <textarea
          rows={3}
          className="w-full resize-y rounded-xl border px-3 py-2"
          placeholder="Вход → выход. Используется для сложных форматов."
          value={typeof values["example"] === "string" ? values["example"] : ""}
          onChange={(e) => onValueChange("example", e.target.value)}
        />
      </div>
    </div>
  );
};