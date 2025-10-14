// components/ActionButtons.tsx
import React from "react";

interface ActionButtonsProps {
  onGenerate: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onGenerate,
}) => {
  return (
    <div className="mt-5 flex items-center justify-between">
      <button className="cursor-not-allowed rounded-xl bg-black px-4 py-2 text-white shadow-sm hover:opacity-90">
        Отправить запрос в нейросеть
      </button>
      <button
        onClick={onGenerate}
        className="rounded-xl bg-black px-4 py-2 text-white shadow-sm hover:opacity-90"
      >
        Сгенерировать и копировать промпт
      </button>
    </div>
  );
};