// src/components/ActionButtons.tsx
import React from "react";

interface ActionButtonsProps {
  onSendToLLM: () => Promise<void> | void;
  onGenerate: () => void;
  disabled?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onSendToLLM, onGenerate, disabled = false }) => {
  return (
    <div className="mt-5 flex items-center justify-between">
      <button
        onClick={() => onSendToLLM()}
        disabled={disabled}
        aria-disabled={disabled}
        className={`rounded-xl px-4 py-2 text-white shadow-sm hover:opacity-90 ${
          disabled ? "cursor-not-allowed bg-gray-400" : "bg-blue-600"
        }`}
      >
        Отправить запрос в нейросеть
      </button>

      <button
        onClick={onGenerate}
        disabled={false}
        className="rounded-xl bg-black px-4 py-2 text-white shadow-sm hover:opacity-90"
      >
        Сгенерировать и копировать промпт
      </button>
    </div>
  );
};

export default ActionButtons;
