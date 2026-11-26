// Frentes da agência: cada uma tem uma IA gestora e um relatório semanal
type AgencyFront = "PAID" | "ORGANIC" | "WHATSAPP";
type ObjectiveKind = "SELL_OFFER" | "BRAND" | "REACTIVATE_BASE" | "LAUNCH";
type ObjectivePriority = "PRIMARY" | "SECONDARY";
type ObjectiveStatus = "ACTIVE" | "PAUSED" | "DONE" | "CANCELLED";
type ObjectiveMetric = "SALES" | "REVENUE" | "NEW_CONTACTS" | "CONVERSATIONS" | "REACH" | "ENGAGEMENT";
type FrontReportStatus = "GENERATING" | "READY" | "FAILED";

type ObjectiveProgress = {
  value: number;
  target: number | null;
  percent: number | null;
  // Quanto já deveria ter feito pela fração do prazo
  expected: number | null;
  // Nulo sem meta, sem prazo ou nos primeiros dias
  onTrack: boolean | null;
  daysLeft: number | null;
};

type BusinessObjective = {
  id: string;
  kind: ObjectiveKind;
  priority: ObjectivePriority;
  status: ObjectiveStatus;
  title: string;
  description: string | null;
  offerId: string | null;
  offerName: string | null;
  metric: ObjectiveMetric;
  target: number | null;
  // AAAA-MM-DD
  startsOn: string;
  deadline: string | null;
  monthlyBudget: number | null;
  fronts: AgencyFront[];
  progress: ObjectiveProgress | null;
  createdAt: string;
  updatedAt: string;
};

type SaveObjectiveBody = {
  kind: ObjectiveKind;
  priority: ObjectivePriority;
  title: string;
  description: string | null;
  offerId: string | null;
  metric: ObjectiveMetric;
  target: number | null;
  startsOn: string | null;
  deadline: string | null;
  monthlyBudget: number | null;
  fronts: AgencyFront[];
};

type FrontIndicator = {
  key: string;
  label: string;
  value: number | null;
  previous: number | null;
  unit: "count" | "money" | "percent" | "seconds";
  // Se subir é bom, ruim ou neutro
  better: "UP" | "DOWN" | "NONE";
};

type FrontAlert = { level: "INFO" | "WARNING" | "CRITICAL"; title: string; detail: string };
type FrontInsight = { title: string; detail: string };

type FrontReport = {
  id: string;
  front: AgencyFront;
  periodStart: string;
  periodEnd: string;
  status: FrontReportStatus;
  indicators: FrontIndicator[];
  details: Record<string, unknown> | null;
  capacity: Record<string, unknown> | null;
  alerts: FrontAlert[];
  diagnosis: string | null;
  opportunities: FrontInsight[];
  risks: FrontInsight[];
  // Por que não há diagnóstico da IA
  aiSkipped: string | null;
  error: string | null;
  generatedAt: string | null;
  updatedAt: string;
};

type AgencyOverview = {
  objectives: BusinessObjective[];
  // O relatório mais recente de cada frente
  reports: FrontReport[];
  // Frentes que o plano e as conexões permitem
  fronts: AgencyFront[];
  aiIncluded: boolean;
};
