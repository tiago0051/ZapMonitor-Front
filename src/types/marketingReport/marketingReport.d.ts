type MarketingReportTotals = {
  platform: string;
  currency: string | null;
  spend: number;
  conversations: number;
  deals: number;
  sales: number;
  salesValue: number;
  meetings: number;
  costPerConversation: number | null;
  costPerSale: number | null;
  costPerMeeting: number | null;
};

// Foto do mês guardada na geração; a página pública só lê isto
type MarketingReportData = {
  clientName: string;
  month: string;
  generatedAt: string;
  ads: MarketingReportTotals | null;
  platforms: MarketingReportTotals[];
  organic: { posts: number; reach: number | null; engagement: number } | null;
  aiChanges: { date: string; description: string; reason: string | null }[];
  nextSteps: string[];
  // Agência: objetivos, semanas do maestro e o último relatório de cada frente; ausente sem o maestro
  agency?: AgencyMonthReport | null;
};

type AgencyMonthReport = {
  objectives: {
    title: string;
    kind: string;
    priority: "PRIMARY" | "SECONDARY";
    metric: string;
    value: number | null;
    target: number | null;
    percent: number | null;
    onTrack: boolean | null;
    deadline: string | null;
  }[];
  weeks: {
    weekStart: string;
    centralMessage: string | null;
    directives: number;
    agenda: { status: string; steps: number; done: number } | null;
    verdicts: { front: string; verdict: "IMPROVED" | "WORSE" | "STABLE" | "NO_DATA" }[];
  }[];
  fronts: {
    front: string;
    period: string;
    indicators: { label: string; value: number | null; previous: number | null; unit: "count" | "money" | "percent" | "seconds" }[];
    diagnosis: string | null;
  }[];
};

type MarketingReport = {
  id: string;
  token: string;
  month: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  // Ainda vale (não expirou nem foi revogado)
  available: boolean;
  data: MarketingReportData;
};
