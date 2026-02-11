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
  if (!value) return true;
  if (typeof value === 'string') {
    return value.trim() === '' || 
           value === 'Выберите вариант' || 
           value === 'Автоматический выбор (рекомендуется)' ||
           value.includes('Система подберет');
  }
  return false;
};

export const hasUserMadeSelections = (extraValues: Record<string, unknown>): boolean => {
  return Object.values(extraValues).some(value => !isEmptySelection(value));
};