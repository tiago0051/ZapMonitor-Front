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
