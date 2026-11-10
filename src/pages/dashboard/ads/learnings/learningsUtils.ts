export const LEARNING_PERIODS = [30, 90, 180] as const;
export type LearningPeriod = (typeof LEARNING_PERIODS)[number];

// Mesmas réguas do back: abaixo disso nenhum valor é julgado e acima/abaixo de 25% vira veredito
export const TRAIT_MIN_TOTAL_SALES = 6;
export const WINNER_INDEX = 1.25;
export const LOSER_INDEX = 0.75;

export const verdictInfo: Record<AdTraitVerdict, { label: string; className: string }> = {
  WINNER: { label: "Vende mais", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  LOSER: { label: "Vende menos", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
  NEUTRAL: { label: "Na média", className: "bg-muted text-muted-foreground" },
  LEARNING: { label: "Aprendendo", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
};

/** 1.6 → "1,6x" */
export const formatShare = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x`;

/** 0.42 → "42%" */
export const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

// Valores que não dizem nada sobre o anúncio e ficam fora dos rankings
export const NO_OBJECTION = "NENHUMA";
export const UNKNOWN_ATTRACTION = "NAO_IDENTIFICADO";

/**
 * Posição da barra centrada em 1x, de -1 (bem abaixo) a 1 (bem acima).
 * Escala logarítmica: 2x e 0,5x ficam à mesma distância do centro; 4x e 0,25x enchem a barra.
 */
export const shareOffset = (value: number) => {
  if (value <= 0) return -1;
  return Math.max(-1, Math.min(1, Math.log2(value) / 2));
};
