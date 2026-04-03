import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | null | undefined, fallback: string = "-"): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value.toLocaleString("pt-BR");
}

export function formatPercentage(value: number | null | undefined, decimals: number = 1, fallback: string = "-"): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}
