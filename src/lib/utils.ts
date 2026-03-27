// import { clsx, type ClassValue } from "clsx"
// import { twMerge } from "tailwind-merge"

// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs))
// }

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// lib/utils.ts
export const isEmptySelection = (value: unknown): boolean => {
  if (value == null) return true;

  if (typeof value === "string") {
    const normalized = value.trim();
    return (
      normalized === "" ||
      normalized === "Выберите вариант" ||
      normalized === "Автоматический выбор (рекомендуется)" ||
      normalized.includes("Система подберет")
    );
  }

  if (Array.isArray(value)) {
    return value.length === 0 || value.every((entry) => isEmptySelection(entry));
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
};

export const hasUserMadeSelections = (extraValues: Record<string, unknown>): boolean => {
  return Object.values(extraValues).some((value) => !isEmptySelection(value));
};
