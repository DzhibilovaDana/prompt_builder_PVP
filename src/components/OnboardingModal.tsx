"use client";

import React, { useEffect, useMemo, useRef } from "react";

type OnboardingStep = {
  title: string;
  body: React.ReactNode;
};

type Props = {
  open: boolean;
  stepIndex: number;
  steps: OnboardingStep[];
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
};

export default function OnboardingModal({
  open,
  stepIndex,
  steps,
  onClose,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const current = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Простая “фокусировка” на модалке при открытии
  useEffect(() => {
    if (!open) return;
    // небольшой таймаут, чтобы DOM успел отрендериться
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Закрытие по ESC
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Не рендерим, если закрыто
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        // клик по оверлею — закрыть
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Онбординг сервиса"
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">
              Шаг {stepIndex + 1} из {steps.length}
            </div>
            <h2 className="mt-1 text-2xl font-semibold">{current.title}</h2>
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            aria-label="Закрыть онбординг"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 text-gray-800 leading-relaxed">{current.body}</div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={onSkip}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Пропустить
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onBack}
              disabled={isFirst}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Назад
            </button>

            {!isLast ? (
              <button
                onClick={onNext}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Далее
              </button>
            ) : (
              <button
                onClick={onFinish}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Готово
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
