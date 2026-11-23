type PipelineStageType = "OPEN" | "WON" | "LOST";

type DealStatus = "OPEN" | "WON" | "LOST";

type DealEventType =
  | "CREATED"
  | "UPDATED"
  | "STAGE_CHANGED"
  | "GROUP_CHANGED"
  | "REOPENED"
  | "FLOW_TRIGGERED"
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "EMAIL_CLICKED"
  // Atividade registrada à mão; o payload traz activityType, outcome e text
  | "ACTIVITY_LOGGED"
  // Proposta enviada, vista, aceita ou recusada; o payload traz action, number, total e via
  | "PROPOSAL"
  // Agente de IA passou a conversa para um humano; o payload traz outputLabel, recommendation e qualified
  | "HANDOFF";

type DealActivityType = "CALL" | "MEETING" | "NOTE" | "EMAIL" | "WHATSAPP";

type CrmFieldType = "TEXT" | "NUMBER" | "DATE" | "SELECT";

type StageFlowResult = "STARTED" | "FLOW_INACTIVE" | "OUTSIDE_WINDOW" | "SERVICE_LIMIT" | "NO_CONTACT" | "FAILED";

type PipelineStage = {
  id: string;
  name: string;
  color: string;
  order: number;
  type: PipelineStageType;
  // Fluxo que roda quando alguém move um negócio para a etapa
  entryFlowId: string | null;
  // Dias sem atividade para um negócio aberto aparecer como esfriando
  staleAfterDays: number | null;
  // Campos que precisam estar preenchidos para mover um negócio para a etapa
  requiredFieldIds: string[];
  // Evento mandado à Meta quando um negócio vindo de anúncio entra na etapa
  conversionEvent: ConversionEventName | null;
  // Negócio que entra na etapa conta como reunião agendada (manual) no custo por reunião
  countsAsMeeting: boolean;
  // Chance de ganho (0 a 100) para a previsão do relatório, quando o negócio não tem nota da IA
  winProbability: number | null;
};

type ConversionEventName = "LEAD_SUBMITTED" | "QUALIFIED_LEAD" | "PURCHASE";

type Pipeline = {
  id: string;
  name: string;
  active: boolean;
  // Mais de um negócio aberto do mesmo contato no funil (recompra); por padrão, um só
  allowMultipleOpenDeals: boolean;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
};

type NamedSummary = {
  id: string;
  name: string;
};

type DealContact = {
  id: string;
  name: string | null;
  surname: string | null;
  phoneNumber: string;
  categories: NamedSummary[];
};

// BROADCAST e EMAIL_CAMPAIGN: respondeu a um disparo ou clicou num e-mail de campanha dentro da janela de atribuição
type DealOriginType = "AD_MESSAGE" | "LEAD_FORM" | "BROADCAST" | "EMAIL_CAMPAIGN";

// Anúncio que trouxe o contato, com os nomes como estavam quando o negócio foi criado
type DealOrigin = {
  type: DealOriginType;
  metaAdId: string | null;
  metaAdSetId: string | null;
  metaCampaignId: string | null;
  detail: {
    adName: string | null;
    adSetName: string | null;
    campaignName: string | null;
    headline: string | null;
    sourceUrl: string | null;
    thumbnailUrl: string | null;
    pageName: string | null;
  } | null;
  // Disparo ou campanha de e-mail de onde veio
  broadcastId?: string | null;
  emailCampaignId?: string | null;
};

type DealOriginCampaign = { metaCampaignId: string; name: string | null };

type Deal = {
  id: string;
  pipelineId: string;
  stageId: string;
  // Nulo quando o negócio veio de um lead de formulário sem telefone
  contact: DealContact | null;
  // Ficha da pessoa, com o e-mail principal; existe também no lead sem telefone
  person: { id: string; name: string | null; email: string | null } | null;
  serviceGroup: NamedSummary | null;
  owner: NamedSummary | null;
  title: string;
  value: number | null;
  notes: string | null;
  status: DealStatus;
  lostReason: string | null;
  lostReasonId: string | null;
  // Última mudança no negócio ou mensagem trocada com o contato
  lastActivityAt: string;
  // Valores dos campos personalizados por id; data no formato aaaa-mm-dd
  customFields: Record<string, string | number>;
  // Tarefa aberta com o prazo mais próximo
  nextTask: { id: string; title: string; dueAt: string } | null;
  openTaskCount: number;
  // Nota de 0 a 100 da última análise de IA
  aiScore: number | null;
  aiInsight: DealAiInsight | null;
  // Último resumo de passagem do agente de IA para um humano
  handoffSummary: DealHandoffSummary | null;
  origin: DealOrigin | null;
  stageEnteredAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DealEvent = {
  id: string;
  type: DealEventType;
  user: NamedSummary | null;
  fromStageId: string | null;
  toStageId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type LostReason = {
  id: string;
  name: string;
  active: boolean;
};

// Campo do negócio ou da ficha do contato
type CrmFieldScope = "DEAL" | "CONTACT";

type CrmField = {
  id: string;
  name: string;
  type: CrmFieldType;
  scope: CrmFieldScope;
  // A IA pode preencher o campo a partir das conversas, seguindo a instrução
  aiFillable: boolean;
  aiInstruction: string | null;
  options: string[];
  active: boolean;
};

// Tipo da tarefa: ligar, mandar mensagem, reunião, e-mail ou outro
type DealTaskType = "CALL" | "MESSAGE" | "MEETING" | "EMAIL" | "OTHER";

type DealTask = {
  id: string;
  deal: { id: string; title: string; pipelineId: string };
  title: string;
  type: DealTaskType;
  dueAt: string;
  assignee: NamedSummary | null;
  completedAt: string | null;
  createdAt: string;
};

type CrmReport = {
  created: number;
  won: { count: number; value: number };
  lost: { count: number; value: number };
  winRate: number | null;
  stages: { stageId: string; reached: number; conversion: number; averageHours: number | null }[];
  lostReasons: { reason: string; count: number }[];
  // Por responsável, os que mais ganharam em valor primeiro; ownerUserId nulo = sem responsável
  owners: {
    ownerUserId: string | null;
    ownerName: string | null;
    created: number;
    won: number;
    wonValue: number;
    lost: number;
    winRate: number | null;
  }[];
  // Negócios abertos agora (não depende do período)
  forecast: { openCount: number; openValue: number; forecastValue: number; withoutProbability: number };
  // Mesmos números no período anterior de mesmo tamanho
  previous: {
    startDate: string;
    endDate: string;
    created: number;
    won: { count: number; value: number };
    lost: { count: number; value: number };
    winRate: number | null;
  };
};

type DealAiInsight = {
  scoreReason: string;
  // Nula quando a IA sugere manter o negócio onde está
  suggestedStageId: string | null;
  nextStep: string;
  analyzedAt: string;
  // Critérios da oferta do negócio, quando ela tem
  qualification?: QualificationResult | null;
};

type QualificationStatus = "MET" | "NOT_MET" | "UNKNOWN";

type QualificationResult = {
  offerId: string;
  offerName: string;
  checks: { id: string; label: string; status: QualificationStatus; evidence: string | null }[];
  // Peso atendido, 0 a 100
  score: number;
  minScore: number;
  qualified: boolean;
  // O que ainda falta descobrir
  missing: string[];
};

type DealHandoffSummary = {
  outputLabel: string;
  summary: string;
  discovered: string[];
  objections: string[];
  recommendation: string;
  qualification: QualificationResult | null;
  createdAt: string;
};
