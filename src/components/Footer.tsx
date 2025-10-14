// components/Footer.tsx
import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-gray-500">
      © {new Date().getFullYear()} PromptBuilder MVP. Прототип только формирует промпт.
    </footer>
  );
};