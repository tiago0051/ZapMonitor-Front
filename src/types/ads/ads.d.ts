type AdSyncStatus = "PENDING" | "SYNCING" | "SUCCESS" | "FAILED";

// YouTube entra pelo Google Ads
type AdPlatform = "META" | "GOOGLE" | "TIKTOK";

type AdAccount = {
  id: string;
  platform: AdPlatform;
  // Id da conta na plataforma: act_ na Meta, customer id no Google Ads, advertiser id no TikTok
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
  // A conta usa um token informado pelo usuário em vez do token da conexão
  hasOwnToken: boolean;
  // Validade do token próprio; nulo quando não expira ou não há token próprio
  tokenExpiresAt: string | null;
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
  /** false quando a conta não foi marcada para o app na conexão com a Meta */
  granted: boolean;
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
  // Telefone digitado no ZapMonitor; tem prioridade sobre o do formulário
  manualPhone: string | null;
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
  // Nota da IA acima do corte calibrado manda QualifiedLead na hora
  qualifiedLeadByScore: boolean;
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
  | "PAUSE"
  // Só manual (pelo usuário): a IA não propõe ativar
  | "ACTIVATE"
  | "SET_DAILY_BUDGET"
  | "ENABLE_ADVANTAGE_AUDIENCE"
  | "ENABLE_ADVANTAGE_PLACEMENTS"
  | "EXCLUDE_AUDIENCE"
  | "MANUAL";

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

type AdChangeStatus = "PENDING_APPROVAL" | "APPLIED" | "FAILED" | "BLOCKED" | "REJECTED" | "REVERTED" | "EXPIRED";

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
  // Proposta pela fila do atendimento (ATTENDANCE reduz, ATTENDANCE_RESTORE volta) ou por um teste (EXPERIMENT)
  origin: "ATTENDANCE" | "ATTENDANCE_RESTORE" | "EXPERIMENT" | null;
  reason: string | null;
  // Depois disso a proposta vence e não pode ser aprovada
  expiresAt: string | null;
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

type AdDraftStatus = "DRAFT" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "ACTIVE";

type SpecialAdCategory = "NONE" | "FINANCIAL_PRODUCTS_SERVICES" | "EMPLOYMENT" | "HOUSING";

type AdCampaignBrief = {
  goal: string;
  product: string;
  offer: string | null;
  audienceDescription: string | null;
  region: string | null;
  // Na moeda da conta
  dailyBudget: number;
  durationDays: number | null;
  notes: string | null;
};

type AdPlanAdSet = {
  key: string;
  name: string;
  ageMin: number;
  ageMax: number;
  countries: string[];
  advantageAudience: boolean;
  // Ids dos públicos na Meta
  includeAudienceIds: string[];
  excludeAudienceIds: string[];
  rationale: string | null;
};

type AdPlanCreative = {
  key: string;
  adSetKey: string;
  name: string;
  primaryText: string;
  headline: string;
  description: string | null;
  // Primeira mensagem que aparece no WhatsApp de quem clica
  welcomeMessage: string;
  assetId: string | null;
  advantageEnhancements: boolean;
};

type AdCampaignPlan = {
  campaignName: string;
  specialAdCategory: SpecialAdCategory;
  dailyBudget: number;
  reasoning: string;
  adSets: AdPlanAdSet[];
  creatives: AdPlanCreative[];
  // A hipótese vira o teste depois de publicar; a IA sugere e o usuário pode editar
  abTest: { enabled: boolean; variable: "creative" | "audience"; hypothesis?: string | null };
  // O que a Meta otimiza; sem o campo (rascunho antigo) vale conversas
  optimizationEvent?: AdOptimizationEvent;
  // Anúncios só no horário da equipe (orçamento total com prazo); sem o campo vale desligado
  teamHoursOnly?: boolean;
};

// CONVERSATIONS: conversas no WhatsApp; PURCHASE: vendas registradas no CRM e mandadas à Meta
type AdOptimizationEvent = "CONVERSATIONS" | "PURCHASE";

type AdDeliveryOptions = {
  // Eventos recebidos pela Meta nos últimos 7 dias
  readiness: { qualified: number; purchases: number; ready: "PURCHASE" | "QUALIFIED_LEAD" | null; missingQualified: number };
  // Compras por semana que a Meta precisa para aprender bem
  minWeeklyPurchases: number;
  conversionsEnabled: boolean;
  // Horário da equipe (configurações do atendimento); nulo sem dias definidos
  teamHours: BroadcastSendWindow | null;
  suggestedOptimizationEvent: AdOptimizationEvent;
};

type AdDraftRouting = {
  whatsappConfigurationId: string | null;
  metaPageId: string | null;
  flowId: string | null;
  pipelineId: string | null;
  stageId: string | null;
  serviceGroupId: string | null;
};

type AdCampaignDraft = AdDraftRouting & {
  id: string;
  name: string;
  status: AdDraftStatus;
  // Status da campanha na Meta pela última sincronização (ex.: ACTIVE, PAUSED); nulo antes de criar ou sincronizar
  campaignStatus: string | null;
  brief: AdCampaignBrief;
  plan: AdCampaignPlan | null;
  // Ids criados na Meta
  published: {
    campaignId: string | null;
    adSets: Record<string, string>;
    ads: Record<string, string>;
    studyId: string | null;
    studyError: string | null;
  } | null;
  error: string | null;
  // O que falta para publicar; só vem no detalhe
  publishErrors: string[];
  publishedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// UPLOAD enviado pelo usuário, GENERATED gerado pela IA, POST postagem da página reaproveitada
type AdAssetOrigin = "UPLOAD" | "GENERATED" | "POST" | "AD";

type AdCreativeAsset = {
  id: string;
  type: "IMAGE" | "VIDEO";
  name: string;
  previewUrl: string | null;
  origin: AdAssetOrigin;
  // Ângulo do criativo feito pela IA
  angle: string | null;
  createdAt: string;
};

type AdCrmAudienceKind = "CUSTOM" | "LOOKALIKE";

// REENGAGE: veio dos anúncios nos últimos 90 dias, conversou e não comprou
type AdCrmAudienceSource = "WON" | "OPEN" | "ALL" | "REENGAGE" | "DISQUALIFIED";

type AdCrmAudience = {
  id: string;
  name: string;
  kind: AdCrmAudienceKind;
  source: AdCrmAudienceSource | null;
  pipelineId: string | null;
  originAudienceId: string | null;
  ratio: number | null;
  metaAudienceId: string | null;
  contactsCount: number;
  status: "PENDING" | "SYNCED" | "FAILED";
  error: string | null;
  lastSyncedAt: string | null;
  // Parte sorteada que não vai para a Meta (0 sem grupo de controle)
  controlPercent: number;
  // Início da medição com o grupo de controle
  controlStartedAt: string | null;
  // Desqualificados: motivos de perda que contam
  lostReasonIds: string[];
};

type AdAudienceLiftGroup = { members: number; conversions: number; rate: number | null };

type AdAudienceLiftVerdict = "LEARNING" | "POSITIVE" | "NO_EFFECT" | "UNCLEAR";

// Quem recebeu o anúncio contra o grupo de controle: vendas que o anúncio realmente trouxe
type AdAudienceLift = {
  treated: AdAudienceLiftGroup;
  control: AdAudienceLiftGroup;
  absoluteLift: number | null;
  relativeLift: number | null;
  // Chance (0 a 1) de quem recebeu comprar mais que o controle
  probPositive: number | null;
  incrementalSales: number | null;
  spend: number;
  costPerIncrementalSale: number | null;
  verdict: AdAudienceLiftVerdict;
  // Frase pronta em pt-BR
  explanation: string;
};

// ---------- Revisão de políticas ----------

type AdComplianceSeverity = "BLOCK" | "WARN";

type AdComplianceField = "headline" | "primaryText" | "description" | "welcomeMessage" | "specialAdCategory";

type AdComplianceIssue = {
  severity: AdComplianceSeverity;
  ruleId: string;
  // Chave do anúncio no plano; null quando vale para a campanha toda
  creativeKey: string | null;
  field: AdComplianceField | null;
  excerpt: string | null;
  message: string;
  suggestion: string;
};

type AdAbTestCell = { cell: string; metaAdSetId: string; row: AdReportRow | null };

// ---------- Piloto automático ----------

type AdBrandProfileData = {
  business: string;
  products: string[];
  audience: string;
  differentiators: string[];
  offers: string[];
  proofs: string[];
  tone: string;
  restrictions: string[];
  avoidWords: string[];
  summary: string;
};

type AdBrandIdentity = { colors: string[]; visualStyle: string; logoDescription: string; engagingThemes: string[]; summary: string };

type AdIdentitySourceStatus = "OK" | "MISSING_PERMISSION" | "NOT_LINKED" | "FAILED";

type AdIdentitySources = {
  page: AdIdentitySourceStatus;
  facebookPosts: AdIdentitySourceStatus;
  instagram: AdIdentitySourceStatus;
  details: string[];
};

type AdCreativeInsights = {
  winningPatterns: string[];
  losingPatterns: string[];
  recommendations: string[];
  summary: string;
  analyzedAdIds: string[];
};

type AdBrandSource = {
  id: string;
  kind: "TEXT" | "FILE";
  name: string;
  mimeType: string | null;
  preview: string;
  length: number;
  createdAt: string;
};

type AdBrandPost = {
  id: string;
  platform: "FACEBOOK" | "INSTAGRAM";
  caption: string | null;
  mediaUrl: string | null;
  permalink: string | null;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  postedAt: string | null;
};

type AdBrandProfile = {
  id: string;
  baseText: string | null;
  profile: AdBrandProfileData | null;
  profileUpdatedAt: string | null;
  metaPageId: string | null;
  instagramUsername: string | null;
  hasLogo: boolean;
  // Logo enviada pelo usuário; sem ela, a foto da página
  logoUploaded: boolean;
  identity: AdBrandIdentity | null;
  identitySources: AdIdentitySources | null;
  identityStatus: "PENDING" | "SYNCING" | "DONE" | "FAILED";
  identityError: string | null;
  identityUpdatedAt: string | null;
  creativeInsights: AdCreativeInsights | null;
  creativeInsightsAt: string | null;
  pilotDailyEnabled: boolean;
  whatsappConfigurationId: string | null;
  // Permissões opcionais que faltam na conexão; sem elas as postagens não são lidas
  missingOptionalScopes: string[];
  sources: AdBrandSource[];
  posts: AdBrandPost[];
};

type AdCreativeVerdict = "WINNER" | "LOSER" | "LEARNING";

type AdCreativeScore = {
  metaAdId: string;
  name: string;
  metaAdSetId: string | null;
  metaCampaignId: string | null;
  effectiveStatus: string | null;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  spend: number;
  impressions: number;
  ctr: number | null;
  conversations: number;
  deals: number;
  wonDeals: number;
  wonValue: number;
  costPerConversation: number | null;
  costPerWonDeal: number | null;
  verdict: AdCreativeVerdict;
  // Já há números para julgar; quando não, o que falta
  enoughData: boolean;
  missingData: string | null;
};

type AdPilotRunStatus = "RUNNING" | "AWAITING_APPROVAL" | "DONE" | "FAILED";

type AdPilotCreativeStatus = "PENDING" | "APPROVED" | "REJECTED";

type AdPilotFormatChoice = "IMAGE" | "VIDEO" | "MIXED";

type AdPilotVideoScript = {
  gancho?: string;
  cenas?: { tempo?: string; fala?: string; legenda?: string; imagem?: string }[];
  chamada?: string;
};

type AdPilotRunCreative = {
  key: string;
  angle: string;
  name: string;
  primaryText: string;
  headline: string;
  description: string | null;
  welcomeMessage: string;
  format: "IMAGE" | "VIDEO";
  script: AdPilotVideoScript | null;
  videoUrl: string | null;
  assetId: string | null;
  assetPreviewUrl: string | null;
  assetOrigin: AdAssetOrigin | null;
  status: AdPilotCreativeStatus;
  error: string | null;
};

type AdPilotCreativeDecision = {
  key: string;
  approved: boolean;
  primaryText?: string | null;
  headline?: string | null;
  description?: string | null;
  welcomeMessage?: string | null;
  script?: AdPilotVideoScript | null;
};

type AdPilotStep = "IDENTITY" | "HISTORY" | "INSIGHTS" | "PLAN" | "CREATIVES" | "VIDEOS" | "DRAFT" | "REVIEW";

type AdPilotRun = {
  id: string;
  kind: "CAMPAIGN" | "DAILY";
  status: AdPilotRunStatus;
  mode: "TEST" | "SCALE" | null;
  step: AdPilotStep | null;
  maxDailyBudget: number | null;
  summary: string | null;
  draftId: string | null;
  creatives: AdPilotRunCreative[];
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

type AdCreativeRefreshStatus = "OPEN" | "APPLIED" | "REJECTED" | "FAILED";

type AdCreativeRefresh = {
  id: string;
  metaAdId: string;
  metaAdSetId: string;
  adName: string;
  reason: string;
  evidence: string;
  assetId: string | null;
  assetPreviewUrl: string | null;
  assetOrigin: AdAssetOrigin | null;
  primaryText: string;
  headline: string;
  description: string | null;
  welcomeMessage: string;
  status: AdCreativeRefreshStatus;
  newMetaAdId: string | null;
  error: string | null;
  decidedAt: string | null;
  createdAt: string;
};

type AdEvidenceThresholdValues = {
  minDeliveryDays: number;
  minImpressions: number;
  expectedConversations: number;
  minConversationsForDeals: number;
};

/** Régua de dados suficientes da conta: o que ela definiu (nulo usa o padrão), os valores em uso e o padrão. */
type AdEvidenceThresholds = {
  custom: { [K in keyof AdEvidenceThresholdValues]: number | null };
  effective: AdEvidenceThresholdValues;
  defaults: AdEvidenceThresholdValues;
};

// Corte de nota do lead qualificado; DEFAULT enquanto o cliente não tem vendas suficientes
type AdSignalCalibration = {
  cutoff: number;
  source: "CLIENT" | "DEFAULT";
  sampleSize: number;
  wonCount: number;
  // Dos negócios acima do corte, quantos compraram (0 a 1)
  saleRate: number | null;
  // Dos que compraram, quantos estavam acima do corte (0 a 1)
  recall: number | null;
  avgTicket: number | null;
  calibratedAt: string | null;
  minSamples: number;
  minWon: number;
  windowDays: number;
};

type AdSignalReadiness = {
  adSetId: string;
  name: string;
  campaignName: string | null;
  optimizationGoal: string | null;
  qualified: number;
  purchases: number;
  ready: "PURCHASE" | "QUALIFIED_LEAD" | null;
  missingQualified: number;
};

type AdAttendanceSettings = {
  enabled: boolean;
  queueLimit: number;
  maxWaitMinutes: number;
  reducePercent: number;
  hours: BroadcastSendWindow;
};

type AdAttendanceQueue = { serviceGroupId: string; name: string; waiting: number; oldestWaitMinutes: number | null };

type AdResponseBucket = "UP_TO_5" | "UP_TO_15" | "UP_TO_60" | "OVER_60" | "NO_REPLY";

type AdResponseAnalysis = {
  buckets: { bucket: AdResponseBucket; deals: number; won: number; winRate: number | null; spend: number }[];
  slowSpend: number;
  lostSales: number | null;
  deals: number;
  spend: number;
};

type AdHourAnalysis = {
  hours: { hour: number; deals: number; won: number; winRate: number | null; teamOpen: boolean }[];
  overallWinRate: number | null;
  outsideShare: number | null;
  outsideWinRate: number | null;
  insideWinRate: number | null;
  deals: number;
  teamHours: BroadcastSendWindow;
};

// ---------- Aprendizados (o anúncio aprende com a conversa) ----------

type AdTraitVerdict = "WINNER" | "LOSER" | "NEUTRAL" | "LEARNING";

type AdTraitValueScore = {
  value: string;
  label: string;
  ads: number;
  spend: number;
  conversations: number;
  sales: number;
  costPerSale: number | null;
  costPerConversation: number | null;
  // Fatia das vendas ÷ fatia da verba: 1 = na média; 1,6 = vende 1,6x a sua parte da verba
  salesIndex: number | null;
  verdict: AdTraitVerdict;
};

type AdTraitScore = { trait: string; label: string; values: AdTraitValueScore[] };

type AdCreativeDnaCoverage = { analyzed: number; pending: number; total: number };

type AdTraitScoreboard = {
  traits: AdTraitScore[];
  totals: { ads: number; analyzedAds: number; spend: number; sales: number; costPerSale: number | null };
  coverage: AdCreativeDnaCoverage;
};

type AdLearningCountItem = { value: string; label: string; count: number };

type AdLearningRow = {
  metaAdId: string;
  name: string;
  deals: number;
  won: number;
  lost: number;
  analyzed: number;
  attractions: AdLearningCountItem[];
  objections: AdLearningCountItem[];
  lostReasons: AdLearningCountItem[];
  quotes: string[];
};

type AdLearnings = {
  totals: {
    deals: number;
    analyzed: number;
    attractions: AdLearningCountItem[];
    objections: AdLearningCountItem[];
    lostReasons: AdLearningCountItem[];
  };
  ads: AdLearningRow[];
};

type AdSegmentInsight = {
  trait: string;
  value: string;
  clients: number;
  ads: number;
  sales: number;
  // Em características: vende Nx a sua parte da verba; na objeção ('objection'): fatia dos negócios com ela (0 a 1)
  salesIndex: number;
  label: string;
  valueLabel: string;
};

type AdSegmentIntelligence = {
  segment: string | null;
  segmentLabel: string | null;
  optOut: boolean;
  computedAt: string | null;
  insights: AdSegmentInsight[];
};

type AdExperimentStatus = "RUNNING" | "WINNER" | "INCONCLUSIVE" | "STOPPED";

type AdExperimentLevel = "AD_SET" | "AD";

type AdExperimentArm = { metaId: string; label: string };

type AdExperimentArmResult = {
  metaId: string;
  label: string;
  spend: number;
  conversations: number;
  sales: number;
  costPerSale: number | null;
  // Chance (0 a 1) de ser o lado que mais vende por real gasto
  probBest: number;
  // Parte da verba que o sistema sugere para este lado (0 a 1)
  budgetShare: number;
};

type AdExperiment = {
  id: string;
  name: string;
  hypothesis: string;
  level: AdExperimentLevel;
  arms: AdExperimentArm[];
  status: AdExperimentStatus;
  // YYYY-MM-DD
  startDate: string;
  endsAt: string;
  results: AdExperimentArmResult[] | null;
  winnerMetaId: string | null;
  // Por que ainda roda ou por que acabou
  conclusion: string | null;
  lastEvaluatedAt: string | null;
  concludedAt: string | null;
  draftId: string | null;
  createdAt: string;
};

type AdExperimentInput = { name: string; hypothesis: string; level: AdExperimentLevel; metaIds: string[]; days?: number };

type AdLearningEntryKind = "EXPERIMENT" | "TRAIT";

type AdLearningEntry = {
  id: string;
  kind: AdLearningEntryKind;
  title: string;
  // Várias linhas
  detail: string;
  experimentId: string | null;
  createdAt: string;
};

// Conexão com o Google Ads (YouTube) ou o TikTok
type AdPlatformConnection = {
  platform: AdPlatform;
  configured: boolean;
  connected: boolean;
  revoked: boolean;
  // E-mail da conta Google ou resumo dos anunciantes do TikTok
  externalUserName: string | null;
  connectedAt: string | null;
  accounts: AdAccount[];
};

type PlatformAvailableAccount = {
  externalId: string;
  name: string;
  currency: string;
  timezoneName: string | null;
  accountStatus: number;
  businessName: string | null;
  linked: boolean;
};

// Link do ZapMonitor que vai no anúncio do YouTube ou do TikTok
type AdTrackedLink = {
  id: string;
  platform: AdPlatform;
  code: string;
  name: string;
  whatsappConfigurationId: string;
  message: string;
  // Endereço para colar como URL final do anúncio
  url: string;
  // Texto pronto dos anúncios de mensagem do TikTok
  prefilledMessage: string;
  externalAdId: string | null;
  active: boolean;
  clicks: number;
  conversations: number;
  createdAt: string;
};

type PlatformConversionSettings = {
  platform: AdPlatform;
  enabled: boolean;
  adAccountId: string | null;
  readyEvents: ConversionEventName[];
  pixelCode: string | null;
  testEventCode: string | null;
};

type AdPlatformSummary = AdReportMetrics & {
  platform: AdPlatform;
  accounts: number;
  currency: string | null;
};

type AdVideoCampaignStatus = "DRAFT" | "PUBLISHING" | "PUBLISHED" | "FAILED";

type AdVideoCampaignRequest = {
  objective: string;
  dailyBudget: number;
  whatsappConfigurationId: string;
  message: string;
  // TikTok: id do vídeo enviado (ou do post, no Spark Ads); YouTube: id do vídeo
  videos: AdVideoCampaignVideo[];
  logoAsset: string | null;
  businessName: string;
};

type AdVideoCampaignPlan = {
  campaignName: string;
  adTexts: string[];
  headlines: string[];
  longHeadlines: string[];
  descriptions: string[];
  callToAction: string;
  ageMin: number;
  ageMax: number;
  rationale: string;
};

type AdVideoCampaign = {
  id: string;
  platform: AdPlatform;
  status: AdVideoCampaignStatus;
  request: AdVideoCampaignRequest;
  plan: AdVideoCampaignPlan | null;
  result: { campaignId?: string; adGroupId?: string; adIds?: string[]; linkId?: string };
  // O que falta para publicar
  missing: string[];
  compliance: { severity: "BLOCK" | "WARN"; message: string; excerpt: string; suggestion: string }[];
  error: string | null;
  createdAt: string;
};

type AdVideoScript = {
  titulo: string;
  gancho: string;
  cenas: { tempo?: string; fala?: string; legenda?: string; imagem?: string }[];
  chamada: string;
  duracaoSegundos?: number;
  porQue?: string;
};

type AdVideoCampaignVideo = {
  id: string;
  name: string;
  // SPARK: post de um criador autorizado pelo código dele
  kind?: "UPLOAD" | "SPARK";
  identityId?: string | null;
};

type TikTokLeadSource = {
  id: string;
  advertiserId: string;
  name: string;
  pipelineId: string | null;
  stageId: string | null;
  serviceGroupId: string | null;
  // Sem a inscrição no webhook, os leads entram só pela importação
  subscriptionError: string | null;
};

type AdVideoGeneration = {
  id: string;
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED";
  error: string | null;
  createdAt: string;
  // Link temporário do vídeo pronto
  url: string | null;
};
