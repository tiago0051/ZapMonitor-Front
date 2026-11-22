type MarketingGoal = "SALES" | "LEADS" | "LAUNCH" | "AWARENESS" | "RECURRENCE";
type MarketingChannel = "META_ADS" | "GOOGLE_ADS" | "TIKTOK_ADS" | "SOCIAL" | "WHATSAPP_BASE" | "EMAIL";
type MarketingStrategyStatus = "GENERATING" | "READY" | "FAILED" | "ARCHIVED";
type MarketingStepStatus = "TODO" | "DOING" | "DONE" | "SKIPPED";
// O módulo do ZapMonitor que executa o passo
type MarketingStepAction =
  | "AD_CAMPAIGN"
  | "SOCIAL_POST"
  | "FLOW"
  | "BROADCAST"
  | "EMAIL_CAMPAIGN"
  | "EMAIL_SEQUENCE"
  | "WHATSAPP_TEMPLATE"
  | "TASK"
  // Camada de venda: roteiro, agente e fluxo SDR montados a partir da oferta
  | "SALES_SETUP";
// O que nasceu da estratégia e ficou ligado a ela
type MarketingLinkKind =
  | "AD_DRAFT"
  | "AD_VIDEO_CAMPAIGN"
  // Campanha sincronizada da plataforma: é a que tem os resultados
  | "AD_CAMPAIGN"
  | "SOCIAL_POST"
  | "PLANNER_TASK"
  | "FLOW"
  | "BROADCAST"
  | "EMAIL_CAMPAIGN"
  | "EMAIL_SEQUENCE"
  | "WHATSAPP_TEMPLATE"
  // Montados pelo "Montar a venda"
  | "SALES_SCRIPT"
  | "AI_AGENT";
// Itens que o atalho do passo liga quando o usuário cria no módulo
type MarketingIntentKind =
  "AD_DRAFT" | "AD_VIDEO_CAMPAIGN" | "FLOW" | "BROADCAST" | "EMAIL_CAMPAIGN" | "EMAIL_SEQUENCE" | "WHATSAPP_TEMPLATE";
type MarketingLinkSource = "PILOT" | "SHORTCUT" | "MARKER" | "PUBLISHED" | "MANUAL";
type MarketingVerdict = "VALIDATED" | "TESTING" | "NOT_VALIDATED" | "NO_DATA";

type MarketingBrief = {
  product: string;
  description: string;
  price: string | null;
  audience: string | null;
  differentiator: string | null;
  goal: MarketingGoal;
  // Prazo para o resultado, em dias
  deadlineDays: number | null;
  // Verba de mídia por mês, em reais
  monthlyBudget: number | null;
  channels: MarketingChannel[];
  notes: string | null;
};

type MarketingPlaybookSummary = {
  slug: string;
  name: string;
  origin: string;
  summary: string;
  principles: string[];
  validation: string[];
  sources: { title: string; url: string }[];
};

type MarketingPlaybookPhase = {
  name: string;
  goal: string;
  steps: { title: string; action: MarketingStepAction; what: string; metric?: string }[];
};

type MarketingPlaybook = MarketingPlaybookSummary & {
  bestFor: string[];
  avoidWhen: string[];
  goals: MarketingGoal[];
  phases: MarketingPlaybookPhase[];
  wikiSlugs: string[];
  // SYSTEM (padrão), EDITED (padrão editado pelo dono) ou CUSTOM (criado pelo dono)
  source: "SYSTEM" | "EDITED" | "CUSTOM";
  enabled: boolean;
  // Aproveitamento no segmento do cliente (só com 3 ou mais empresas)
  segmentStat?: { segment: string; clients: number; validated: number; rate: number } | null;
};

// O que o dono edita
type MarketingPlaybookData = Omit<MarketingPlaybook, "source" | "enabled" | "segmentStat">;

type MarketingAdValidation = {
  score: number;
  summary: string;
  criteria: { key: string; label: string; score: number; comment: string }[];
  suggestions: string[];
  compliance: { severity: "BLOCK" | "WARN"; message: string }[];
};

type MarketingStrategyLink = {
  id: string;
  kind: MarketingLinkKind;
  objectId: string;
  source: MarketingLinkSource;
  createdAt: string;
  // Última avaliação do anúncio pelo validador
  validation: { score: number; result: MarketingAdValidation; updatedAt: string } | null;
  // Campanha: nome atual; lostMarker quando foi renomeada sem a marca (continua ligada pelo id)
  name?: string | null;
  lostMarker?: boolean;
};

type StrategyMetrics = {
  spend: number;
  conversations: number;
  deals: number;
  qualifiedDeals: number;
  wonDeals: number;
  wonValue: number;
  costPerConversation: number | null;
  costPerQualifiedDeal: number | null;
  costPerWonDeal: number | null;
  roas: number | null;
  activeDays: number;
};

type StrategyResults = {
  since: string;
  until: string;
  currency: string | null;
  strategy: StrategyMetrics;
  // O que está fora de qualquer estratégia, nas mesmas contas e período
  baseline: StrategyMetrics | null;
  steps: { stepId: string; metrics: StrategyMetrics; verdict: MarketingVerdict; reason: string }[];
  campaigns: { id: string; name: string; stepId: string | null; metrics: StrategyMetrics }[];
};

type StrategyResultsResponse = {
  verdict: MarketingVerdict | null;
  verdictReason: string | null;
  resultsAt: string | null;
  results: StrategyResults | null;
  steps: { stepId: string; verdict: MarketingVerdict | null; verdictReason: string | null }[];
};

type ReviewRecommendation = {
  id: string;
  kind: "ADVANCE" | "ADJUST" | "SWITCH_PLAYBOOK" | "PAUSE";
  title: string;
  detail: string;
  stepOrder: number | null;
  playbookSlug: string | null;
  status: "PENDING" | "ACCEPTED" | "DISMISSED";
  outcome: string | null;
};

type MarketingStrategyReview = {
  id: string;
  status: "GENERATING" | "READY" | "FAILED";
  summary: string | null;
  recommendations: ReviewRecommendation[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type LinkableCampaign = {
  id: string;
  name: string;
  platform: "META" | "GOOGLE" | "TIKTOK";
  effectiveStatus: string;
  strategyId: string | null;
  stepId: string | null;
};

type MarketingStrategyStep = {
  id: string;
  order: number;
  phase: string;
  title: string;
  what: string;
  why: string;
  action: MarketingStepAction;
  channel: string | null;
  metric: string | null;
  target: string | null;
  startDay: number;
  durationDays: number;
  startsOn: string | null;
  status: MarketingStepStatus;
  completedAt: string | null;
  verdict: MarketingVerdict | null;
  verdictReason: string | null;
  // [EST-código-Ppasso]: vai no nome do que o passo cria nas plataformas
  marker: string;
  // Texto que o atalho leva para o módulo (tarefa, postagem, piloto)
  briefing: string;
  links: MarketingStrategyLink[];
};

type MarketingStrategySummary = {
  id: string;
  code: string;
  marker: string;
  name: string;
  status: MarketingStrategyStatus;
  goal: MarketingGoal;
  product: string;
  playbook: MarketingPlaybookSummary | null;
  verdict: MarketingVerdict | null;
  verdictReason: string | null;
  stepCount: number;
  doneCount: number;
  linkCount: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type MarketingStrategy = {
  id: string;
  code: string;
  marker: string;
  name: string;
  status: MarketingStrategyStatus;
  brief: MarketingBrief;
  // Oferta do cadastro que a estratégia vende
  offerId: string | null;
  requestedPlaybookSlug: string | null;
  playbook: MarketingPlaybookSummary | null;
  secondaryPlaybook: MarketingPlaybookSummary | null;
  rationale: string | null;
  summary: string | null;
  coreMessage: string | null;
  error: string | null;
  startsOn: string | null;
  verdict: MarketingVerdict | null;
  verdictReason: string | null;
  results: StrategyResults | null;
  resultsAt: string | null;
  createdAt: string;
  updatedAt: string;
  steps: MarketingStrategyStep[];
  // Vínculos de passos que sumiram quando o plano foi refeito
  unassignedLinks: MarketingStrategyLink[];
};

// Atalho aberto num passo: o próximo item criado no módulo nasce ligado a ele
type MarketingActiveIntent = {
  kind: MarketingIntentKind;
  strategyId: string;
  strategyName: string;
  stepOrder: number;
  stepTitle: string;
  expiresAt: string;
};

/** Opções do "Montar a venda". */
type SalesSetupOptions = {
  offer: { id: string; name: string; hasCriteria: boolean } | null;
  stepId: string | null;
  pipelines: { id: string; name: string }[];
  serviceGroups: { id: string; name: string }[];
  aiAgents: { id: string; name: string; sellsOffer: boolean }[];
  salesScripts: { id: string; name: string }[];
  linked: { salesScriptId: string | null; aiAgentId: string | null; flowId: string | null };
  // Por que não dá para montar (sem oferta, sem CRM, sem permissão)
  blockers: string[];
};

type SalesSetupInput = {
  stepId?: string | null;
  pipelineId: string;
  serviceGroupId: string;
  aiAgentId?: string | null;
  salesScriptId?: string | null;
};

type SalesSetupResult = {
  flow: { id: string; name: string };
  aiAgent: { id: string; name: string; created: boolean };
  salesScript: { id: string; name: string; created: boolean };
  offerHasCriteria: boolean;
  issues: string[];
};
