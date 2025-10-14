// components/Header.tsx
import React from "react";

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-black"></div>
          <span className="text-lg font-semibold">PromptBuilder · MVP</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hidden sm:inline">Декоративные: </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">Золотые промпты</span>
          <span className="rounded-full bg-gray-100 px-3 py-1">История (оценки)</span>
          <span className="rounded-full bg-gray-100 px-3 py-1">Выбор модели</span>
        </div>
      </div>
    </header>
  );
};