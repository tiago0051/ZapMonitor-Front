// Consumo do mês do tenant (tela "Plano e consumo"); a IA vem sempre em percentual do limite, nunca em tokens
type AiUsageKind = "AGENT" | "TEXT" | "IMAGE" | "VIDEO";

type AiUsageStatus = {
  // O plano inclui IA
  includesAi: boolean;
  // Percentual usado do mês; pode passar de 100
  percent: number;
  // Acabou: os agentes param e os contatos vão para a fila
  paused: boolean;
};

type AiMonthUsage = AiUsageStatus & {
  // Previsão do mês no ritmo atual
  forecastPercent: number;
  byKindPercent: Record<AiUsageKind, number>;
  monthStart: string;
  monthEnd: string;
};

type PlanResourceUsage = {
  resource: string;
  label: string;
  used: number;
  limit: number;
  unit: "count" | "gb";
};

type PlanUsage = {
  hasPlan: boolean;
  ai: AiMonthUsage;
  resources: PlanResourceUsage[];
};
