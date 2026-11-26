import { FaWhatsapp } from "react-icons/fa";
import { Megaphone } from "lucide-react";
import { FiInstagram } from "react-icons/fi";
import type { ComponentType } from "react";

export const frontInfo: Record<
  AgencyFront,
  { label: string; manager: string; icon: ComponentType<{ className?: string }>; description: string }
> = {
  PAID: {
    label: "Tráfego pago",
    manager: "Gestora de tráfego pago",
    icon: Megaphone,
    description: "Anúncios na Meta, YouTube e TikTok: verba, custo por venda e testes.",
  },
  ORGANIC: {
    label: "Orgânico",
    manager: "Gestora de orgânico",
    icon: FiInstagram,
    description: "Postagens e artes no Facebook e no Instagram: alcance, engajamento e agenda.",
  },
  WHATSAPP: {
    label: "WhatsApp e relacionamento",
    manager: "Gestora de WhatsApp e relacionamento",
    icon: FaWhatsapp,
    description: "Atendimento com agentes de IA e equipe, disparos e e-mails: conversas, vendas e fila.",
  },
};

export const frontOrder: AgencyFront[] = ["PAID", "ORGANIC", "WHATSAPP"];

export const objectiveKindLabel: Record<ObjectiveKind, string> = {
  SELL_OFFER: "Vender uma oferta",
  BRAND: "Fortalecer a marca",
  REACTIVATE_BASE: "Reativar a base de clientes",
  LAUNCH: "Lançamento",
};

export const objectiveKindHint: Record<ObjectiveKind, string> = {
  SELL_OFFER: "Vender mais de um produto, serviço ou plano já cadastrado em Ofertas.",
  BRAND: "Ser mais vista e lembrada: seguidores, alcance, engajamento e conversas que chegam pelo orgânico.",
  REACTIVATE_BASE: "Trazer de volta quem já comprou ou já conversou e sumiu.",
  LAUNCH: "Apresentar algo novo com começo, meio e fim.",
};

// Indicador sugerido para cada tipo
export const defaultMetric: Record<ObjectiveKind, ObjectiveMetric> = {
  SELL_OFFER: "SALES",
  BRAND: "FOLLOWERS",
  REACTIVATE_BASE: "CONVERSATIONS",
  LAUNCH: "SALES",
};

export const metricLabel: Record<ObjectiveMetric, string> = {
  SALES: "Vendas (negócios ganhos)",
  REVENUE: "Faturamento (valor ganho)",
  NEW_CONTACTS: "Contatos novos no WhatsApp",
  CONVERSATIONS: "Atendimentos",
  REACH: "Alcance das postagens",
  ENGAGEMENT: "Engajamento das postagens",
  FOLLOWERS: "Seguidores ganhos (Facebook + Instagram)",
  ORGANIC_CONVERSATIONS: "Conversas pelos links do orgânico",
};

/** Fatia da pauta de cada objetivo ativo: 70% para o principal e 30% divididos entre os secundários. */
export const objectiveMix = (objectives: BusinessObjective[]) => {
  const active = objectives.filter((objective) => objective.status === "ACTIVE");
  const primary = active.find((objective) => objective.priority === "PRIMARY");
  const secondaries = active.filter((objective) => objective.priority === "SECONDARY");
  const mix = new Map<string, number>();
  if (!primary) secondaries.forEach((objective) => mix.set(objective.id, Math.round(100 / secondaries.length)));
  else if (!secondaries.length) mix.set(primary.id, 100);
  else {
    mix.set(primary.id, 70);
    secondaries.forEach((objective) => mix.set(objective.id, Math.round(30 / secondaries.length)));
  }
  return mix;
};

export const objectiveStatusLabel: Record<ObjectiveStatus, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  DONE: "Concluído",
  CANCELLED: "Cancelado",
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export const formatMetricValue = (metric: ObjectiveMetric, value: number | null) =>
  value === null ? "—" : metric === "REVENUE" ? money.format(value) : number.format(value);

export const formatIndicator = (indicator: Pick<FrontIndicator, "unit">, value: number | null) => {
  if (value === null) return "—";
  switch (indicator.unit) {
    case "money":
      return money.format(value);
    case "percent":
      return `${number.format(value)}%`;
    case "seconds":
      return value >= 3600 ? `${number.format(value / 3600)} h` : `${Math.max(1, Math.round(value / 60))} min`;
    default:
      return number.format(value);
  }
};

/** Variação com o sentido (bom, ruim, neutro) para colorir; nula sem base de comparação. */
export const indicatorChange = (indicator: FrontIndicator) => {
  if (indicator.value === null || indicator.previous === null || indicator.previous === 0) return null;
  const percent = Math.round(((indicator.value - indicator.previous) / indicator.previous) * 1000) / 10;
  if (percent === 0) return { percent, tone: "neutral" as const };
  const good = indicator.better === "UP" ? percent > 0 : indicator.better === "DOWN" ? percent < 0 : null;
  return { percent, tone: good === null ? ("neutral" as const) : good ? ("good" as const) : ("bad" as const) };
};

export const alertTone: Record<FrontAlert["level"], string> = {
  CRITICAL: "border-destructive/40 bg-destructive/5 text-destructive",
  WARNING: "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-300",
  INFO: "border-border bg-muted/40 text-foreground",
};

// Indicadores que resumem cada frente no cartão
export const headlineKeys: Record<AgencyFront, string[]> = {
  PAID: ["spend", "sales", "costPerSale"],
  ORGANIC: ["posts", "reach", "engagement"],
  WHATSAPP: ["conversations", "wonDeals", "avgSecondsToAttendant"],
};

export const formatDay = (value: string) => {
  const [year, month, day] = value.substring(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

/** Período do relatório: o fim é a meia-noite do dia seguinte ao último dia. */
export const reportPeriodLabel = (report: Pick<FrontReport, "periodStart" | "periodEnd">) => {
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" };
  const start = new Date(report.periodStart).toLocaleDateString("pt-BR", options);
  const end = new Date(new Date(report.periodEnd).getTime() - 1).toLocaleDateString("pt-BR", options);
  return `${start} a ${end}`;
};
