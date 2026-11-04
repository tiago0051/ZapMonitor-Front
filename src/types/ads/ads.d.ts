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

type ConversionEventStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

type ConversionChannel = "WHATSAPP" | "LEAD_FORM";

type ConversionSettingsValues = {
  enabled: boolean;
  // Negócio criado a partir de anúncio manda LeadSubmitted
  leadSubmittedOnCreate: boolean;
  // Conjunto de dados (pixel) dos leads de formulário
  leadsDatasetId: string | null;
  // Código de teste do Gerenciador de Eventos
  testEventCode: string | null;
};

type ConversionSettings = ConversionSettingsValues & {
  // Eventos dos últimos 7 dias por nome e situação
  health: { eventName: ConversionEventName; status: ConversionEventStatus; count: number }[];
};

type ConversionEvent = {
  id: string;
  dealId: string;
  dealTitle: string | null;
  eventName: ConversionEventName;
  channel: ConversionChannel | null;
  // event_id mandado à Meta, que deduplica o evento
  eventId: string;
  datasetId: string | null;
  status: ConversionEventStatus;
  value: number | null;
  eventTime: string;
  eventsReceived: number | null;
  error: string | null;
  attempts: number;
  sentAt: string | null;
  createdAt: string;
};

type AdSuggestionStatus = "OPEN" | "ACCEPTED" | "REJECTED" | "POSTPONED";

type AdSuggestionPriority = "HIGH" | "MEDIUM" | "LOW";

type AdSuggestionSource = "AUDIT" | "DAILY" | "CHAT";

type AdSuggestionActionType =
  "PAUSE" | "SET_DAILY_BUDGET" | "ENABLE_ADVANTAGE_AUDIENCE" | "ENABLE_ADVANTAGE_PLACEMENTS" | "EXCLUDE_AUDIENCE" | "MANUAL";

type AdTargetLevel = "account" | "campaign" | "adset" | "ad";

type AdSuggestion = {
  id: string;
  source: AdSuggestionSource;
  category: string;
  priority: AdSuggestionPriority;
  title: string;
  problem: string;
  evidence: string;
  proposedChange: string;
  expectedImpact: string;
  targetLevel: AdTargetLevel | null;
  targetMetaId: string | null;
  targetName: string | null;
  // Mudança que a aplicação com aprovação vai executar; MANUAL é orientação
  action: { type: AdSuggestionActionType; value?: number | null; audienceId?: string | null } | null;
  status: AdSuggestionStatus;
  postponedUntil: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  // Mudança gerada pela sugestão aceita
  change: { id: string; status: AdChangeStatus; error: string | null } | null;
  createdAt: string;
};

type AdAnalysis = {
  id: string;
  kind: "AUDIT" | "DAILY";
  status: "RUNNING" | "DONE" | "FAILED";
  summary: string | null;
  error: string | null;
  suggestionsCount: number;
  startedAt: string;
  finishedAt: string | null;
};

type AdAdvisorStatus = {
  // A IA está ativa e com cota
  aiEnabled: boolean;
  dailyAnalysis: boolean;
  latestAnalysis: AdAnalysis | null;
};

type AdChat = { id: string; title: string; createdAt: string; updatedAt: string };

type AdChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  // Sugestões criadas nesta resposta
  suggestionIds: string[];
  createdAt: string;
};

type AdChatConversation = { chat: AdChat; messages: AdChatMessage[]; suggestions: AdSuggestion[] };

type AdChangeStatus = "PENDING_APPROVAL" | "APPLIED" | "FAILED" | "BLOCKED" | "REJECTED" | "REVERTED";

// Só os campos que a mudança toca; orçamento na moeda da conta
type AdChangeState = {
  status?: string | null;
  dailyBudget?: number | null;
  advantageAudience?: boolean;
  // Plataformas escolhidas à mão; vazio é Advantage+
  placements?: string[];
  excludedAudienceIds?: string[];
};

type AdChange = {
  id: string;
  type: AdSuggestionActionType;
  targetLevel: AdTargetLevel;
  targetMetaId: string;
  targetName: string;
  // Enquanto pendente, da última sincronização; depois de aplicada, o estado lido na Meta
  before: AdChangeState | null;
  after: AdChangeState;
  status: AdChangeStatus;
  error: string | null;
  suggestionTitle: string | null;
  ruleName: string | null;
  // Mudança desfeita por esta
  revertOfChangeId: string | null;
  requestedByName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  appliedAt: string | null;
  revertedByName: string | null;
  revertedAt: string | null;
  createdAt: string;
};

type AdGuardrails = {
  // Aumento máximo do orçamento diário de um item em 24 horas
  maxBudgetIncreasePercent: number;
  // Horário no fuso da conta; fim não incluso
  allowedStartHour: number;
  allowedEndHour: number;
  allowWeekends: boolean;
  // Regras automáticas podem aplicar sem aprovação
  allowAutoApply: boolean;
};

type AdRuleMetric =
  "SPEND" | "CTR" | "CONVERSATIONS" | "COST_PER_CONVERSATION" | "DEALS" | "COST_PER_DEAL" | "WON_DEALS" | "COST_PER_WON_DEAL" | "ROAS";

type AdRuleOperator = "GREATER_THAN" | "LESS_THAN";

type AdRuleAction = "PAUSE" | "INCREASE_BUDGET" | "DECREASE_BUDGET";

type AdRuleValues = {
  name: string;
  active: boolean;
  level: "campaign" | "adset" | "ad";
  metric: AdRuleMetric;
  operator: AdRuleOperator;
  threshold: number;
  periodDays: number;
  minSpend: number;
  action: AdRuleAction;
  actionValue: number | null;
  requiresApproval: boolean;
};

type AdRule = AdRuleValues & { id: string; lastRunAt: string | null };
