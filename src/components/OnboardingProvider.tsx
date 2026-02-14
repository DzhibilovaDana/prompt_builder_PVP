"use client";

import React, { useEffect, useMemo, useState } from "react";
import OnboardingModal from "./OnboardingModal";

/**
 * ВАЖНО:
 * - если вы поменяете текст/шаги, просто поменяйте версию ключа,
 *   чтобы старым пользователям онбординг показался снова.
 */
const ONBOARDING_STORAGE_KEY = "promptbuilder:onboarding:v1";

type Props = {
  children: React.ReactNode;
};

export default function OnboardingProvider({ children }: Props) {
  const steps = useMemo(
    () => [
      {
        title: "Что это за сервис",
        body: (
          <div className="space-y-3">
            <p>
              Это <b>конструктор промптов</b>: он помогает быстро собрать качественный запрос к LLM
              из готовых блоков и полей — без “магии” и без ручного подбора формулировок.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Вы выбираете индустрию и формат ответа</li>
              <li>Заполняете поля (цель, контекст, примеры и т.д.)</li>
              <li>Получаете готовый промпт и копируете его</li>
            </ul>
          </div>
        ),
      },
      {
        title: "Как собрать промпт",
        body: (
          <div className="space-y-3">
            <p>
              На главной странице выберите:
              <b> индустрию</b>, <b>формат</b> и (если есть) подопции.
            </p>
            <p>
              Затем заполните поля. Некоторые поля появляются динамически — это зависит от выбранного формата.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>Задача</b>: что вы хотите получить от модели</li>
              <li><b>Контекст</b>: детали, ограничения, исходные данные</li>
              <li><b>Пример</b>: желаемый стиль/структура ответа</li>
            </ul>
          </div>
        ),
      },
      {
        title: "Результат, копирование и избранное",
        body: (
          <div className="space-y-3">
            <p>
              Нажмите <b>Generate</b> — сервис соберёт итоговый промпт.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Кнопка <b>Copy</b> копирует текст промпта</li>
              <li><b>Избранное</b> сохраняет удачные промпты локально</li>
              <li>Можно экспортировать результат (если у вас это поддержано)</li>
            </ul>
          </div>
        ),
      },
    ],
    []
  );

  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // При первом заходе показываем онбординг (если не пройден)
  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "done";
      if (!done) {
        setOpen(true);
        setStepIndex(0);
      }
    } catch {
      // если localStorage недоступен — просто не блокируем
    }
  }, []);

  const markDone = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
    } catch {}
  };

  const close = () => setOpen(false);

  const next = () => setStepIndex((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStepIndex((s) => Math.max(s - 1, 0));
  const skip = () => {
    markDone();
    setOpen(false);
  };
  const finish = () => {
    markDone();
    setOpen(false);
  };

  // Кнопка "Справка" (открыть онбординг снова)
  const openHelp = () => {
    setStepIndex(0);
    setOpen(true);
  };

  const resetOnboarding = () => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {}
    setStepIndex(0);
    setOpen(true);
  };

  return (
    <>
      {children}

      <OnboardingModal
        open={open}
        stepIndex={stepIndex}
        steps={steps}
        onClose={close}
        onNext={next}
        onBack={back}
        onSkip={skip}
        onFinish={finish}
      />

      {/* Плавающая кнопка справки (можно убрать/перенести в header) */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
        <button
          onClick={openHelp}
          className="rounded-full bg-black px-4 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90"
          aria-label="Открыть справку"
          title="Справка"
        >
          ?
        </button>

        {/* Опционально: кнопка для сброса (удобно при тестах/демо) */}
        <button
          onClick={resetOnboarding}
          className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-lg hover:bg-gray-100"
          aria-label="Сбросить онбординг"
          title="Сбросить онбординг"
        >
          reset
        </button>
      </div>
    </>
  );
}
