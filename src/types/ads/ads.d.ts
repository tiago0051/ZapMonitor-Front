type AdSyncStatus = "PENDING" | "SYNCING" | "SUCCESS" | "FAILED";

type AdAccount = {
  id: string;
  metaAccountId: string;
  name: string;
  currency: string;
  timezoneName: string | null;
  // account_status da Meta: 1 ativa, 2 desativada, 3 sem pagamento...
  accountStatus: number;
  businessName: string | null;
  syncStatus: AdSyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
};

type MetaAdsConnection = {
  connected: boolean;
  metaUserName: string | null;
  scopes: string[];
  // Permissões que destravam as próximas fases e ainda não foram concedidas
  missingScopes: string[];
  tokenExpiresAt: string | null;
  accounts: AdAccount[];
};

type AvailableAdAccount = {
  metaAccountId: string;
  name: string;
  currency: string;
  accountStatus: number;
  businessName: string | null;
  linked: boolean;
};

type AdCreativeSnapshot = {
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  callToActionType: string | null;
  objectType: string | null;
};

type MetaAd = {
  metaId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  creative: AdCreativeSnapshot | null;
};

type MetaAdSet = {
  metaId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  // Centavos da moeda da conta
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  optimizationGoal: string | null;
  billingEvent: string | null;
  destinationType: string | null;
  targeting: Record<string, unknown> | null;
  ads: MetaAd[];
};

type MetaCampaign = {
  metaId: string;
  name: string;
  objective: string | null;
  status: string;
  effectiveStatus: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  bidStrategy: string | null;
  adSets: MetaAdSet[];
};

type MetaAudience = {
  metaId: string;
  name: string;
  subtype: string | null;
  approximateCount: number | null;
  deliveryStatus: string | null;
};

type AdAccountStructure = {
  account: AdAccount;
  campaigns: MetaCampaign[];
  audiences: MetaAudience[];
};

type AdReportLevel = "campaign" | "adset" | "ad";

type AdReportMetrics = {
  // Na moeda da conta
  spend: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  // Contagens da Meta
  metaConversations: number;
  metaLeads: number;
  // Contagens do CRM: conversas que chegaram com o anúncio de origem e leads de formulário recebidos
  crmConversations: number;
  crmLeads: number;
  deals: number;
  // Avançaram além da primeira etapa
  qualifiedDeals: number;
  wonDeals: number;
  wonValue: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  costPerConversation: number | null;
  costPerLead: number | null;
  costPerDeal: number | null;
  costPerQualifiedDeal: number | null;
  costPerWonDeal: number | null;
  roas: number | null;
};

type AdReportRow = AdReportMetrics & {
  // Id da campanha, conjunto ou anúncio na Meta
  id: string;
  name: string;
  effectiveStatus: string | null;
};

type AdReport = {
  level: AdReportLevel;
  since: string;
  until: string;
  currency: string;
  rows: AdReportRow[];
  total: AdReportMetrics;
  days: { date: string; spend: number; metaConversations: number; metaLeads: number }[];
};

type AdAlertSeverity = "critical" | "warning" | "info";

type AdAlert = { severity: AdAlertSeverity; title: string; detail: string };

type AdDailySummary = {
  date: string;
  currency: string;
  day: AdReportMetrics;
  // Média diária dos 7 dias anteriores
  previousAverage: AdReportMetrics;
  alerts: AdAlert[];
};

type AvailableAdPage = {
  metaPageId: string;
  name: string;
  // A conexão recebeu o token da página, necessário para ler os leads
  hasAccess: boolean;
  linked: boolean;
};

type AdLeadPage = {
  id: string;
  metaPageId: string;
  name: string;
  pipelineId: string | null;
  stageId: string | null;
  serviceGroupId: string | null;
  createdAt: string;
};

type AdLeadPageTarget = { pipelineId: string | null; stageId: string | null; serviceGroupId: string | null };

type AdLeadStatus = "PENDING" | "CREATED" | "NO_PHONE" | "FAILED";

type AdLead = {
  id: string;
  metaLeadId: string;
  pageName: string | null;
  metaAdId: string | null;
  metaCampaignId: string | null;
  fields: { name: string; values: string[] }[];
  status: AdLeadStatus;
  error: string | null;
  whatsappContactId: string | null;
  dealId: string | null;
  dealTitle: string | null;
  leadCreatedAt: string | null;
  createdAt: string;
};
