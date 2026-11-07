type PipelineStageType = "OPEN" | "WON" | "LOST";

type DealStatus = "OPEN" | "WON" | "LOST";

type DealEventType =
  "CREATED" | "UPDATED" | "STAGE_CHANGED" | "GROUP_CHANGED" | "REOPENED" | "FLOW_TRIGGERED" | "TASK_CREATED" | "TASK_COMPLETED";

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
};

type ConversionEventName = "LEAD_SUBMITTED" | "QUALIFIED_LEAD" | "PURCHASE";

type Pipeline = {
  id: string;
  name: string;
  active: boolean;
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

type DealOriginType = "AD_MESSAGE" | "LEAD_FORM";

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
  options: string[];
  active: boolean;
};

type DealTask = {
  id: string;
  deal: { id: string; title: string; pipelineId: string };
  title: string;
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
};

type DealAiInsight = {
  scoreReason: string;
  // Nula quando a IA sugere manter o negócio onde está
  suggestedStageId: string | null;
  nextStep: string;
  analyzedAt: string;
};
