// components/UserTaskRenderer.tsx
import React, { useState } from "react";

interface UserTaskRendererProps {
  userTask: string;
  onUserTaskChange: (value: string) => void;
}

const TASK_EXAMPLES = [
  "Напиши email для клиента о новых возможностях продукта",
  "Создай план презентации для инвесторов",
  "Разработай структуру технического задания",
  "Подготовь ответ на частые вопросы клиентов",
  "Составь инструкцию по использованию функции",
  "Напиши пост для социальных сетей о новом продукте",
  "Создай сценарий видео-объяснения",
  "Разработай чек-лист для проверки качества"
];

export const UserTaskRenderer: React.FC<UserTaskRendererProps> = ({
  userTask,
  onUserTaskChange,
}) => {
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium">Ваш запрос / задача</label>
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {showExamples ? "Скрыть примеры" : "Показать примеры"}
        </button>
      </div>

      {showExamples && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {TASK_EXAMPLES.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onUserTaskChange(example)}
              className="text-left p-2 text-xs border rounded-lg hover:bg-gray-50 truncate"
              title={example}
            >
              {example}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={userTask}
        onChange={(e) => onUserTaskChange(e.target.value)}
        placeholder="Опишите, что нужно сделать..."
        rows={5}
        className="w-full resize-y rounded-xl border px-3 py-2"
      />
    </div>
  );
};