type BroadcastStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "PAUSED" | "COMPLETED" | "CANCELED";

type BroadcastRecipientStatus = "PENDING" | "SENDING" | "SENT" | "DELIVERED" | "READ" | "REPLIED" | "FAILED" | "SKIPPED" | "CANCELED";

/** Horário de Brasília: minutos desde a meia-noite (fim não incluído) e dias da semana, 0 = domingo. */
type BroadcastSendWindow = { startMinute: number; endMinute: number; days: number[] };

/** O que acontece com quem responde: fluxo do atendimento e negócio no funil. */
type BroadcastReply = {
  flowId: string | null;
  pipelineId: string | null;
  stageId: string | null;
  serviceGroupId: string | null;
};

type BroadcastMetrics = {
  optedOut: number;
  // Mensagens que a Meta marcou como cobradas, por categoria
  billable: Record<string, number>;
  // Negócios que nasceram ou avançaram depois da resposta ao disparo, dentro da janela de atribuição
  deals: CampaignDealResults;
  attributionDays: number;
  // Resultado de cada modelo no teste A/B; nulo sem teste
  ab: Record<"A" | "B", BroadcastAbTotals> | null;
};

/** Teste A/B de modelo: parte da lista recebe A (o modelo da campanha) ou B; o vencedor vai para o resto. */
type BroadcastAbConfig = { templateId: string; testPercent: number; metric: "REPLY" | "DEAL"; waitHours: number };

type BroadcastAbTest = BroadcastAbConfig & {
  templateName: string;
  templateLanguage: string;
  phase: "TESTING" | "DECIDED";
  winner: "A" | "B" | null;
  decideAt: string | null;
};

type BroadcastAbTotals = { sent: number; replied: number; deals: number };

/** Vendas de uma campanha: negócios atribuídos, quantos ganhos e o valor ganho (R$). */
type CampaignDealResults = { deals: number; won: number; wonValue: number };

type BroadcastTotals = {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  skipped: number;
  canceled: number;
};

type Broadcast = {
  id: string;
  name: string;
  status: BroadcastStatus;
  source: "SCREEN" | "API" | "AUTOMATION";
  configurationId: string;
  configurationPhoneNumber: string | null;
  templateId: string | null;
  templateName: string;
  templateLanguage: string;
  templateCategory: string | null;
  headerFileId: string | null;
  sendWindow: BroadcastSendWindow | null;
  reply: BroadcastReply;
  frequencyCapDays: number | null;
  audienceConsentAt: string | null;
  abTest: BroadcastAbTest | null;
  pausedReason: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdByName: string | null;
  createdAt: string;
  totals: BroadcastTotals;
};

type BroadcastRecipient = {
  id: string;
  phoneNumber: string;
  name: string | null;
  contactId: string | null;
  status: BroadcastRecipientStatus;
  skipReason: "OPTED_OUT" | "INVALID_PHONE" | "FREQUENCY_CAP" | null;
  errorCode: number | null;
  errorMessage: string | null;
  variables: Record<string, string> | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  repliedAt: string | null;
  optedOutAt: string | null;
  failedAt: string | null;
  variant: "A" | "B" | null;
};

type BroadcastAudienceContact = {
  contactId: string;
  phoneNumber: string;
  name: string | null;
  surname: string | null;
  dealTitle: string | null;
  fields: Record<string, string>;
};

type BroadcastOptOut = {
  id: string;
  phoneNumber: string;
  source: "KEYWORD" | "BUTTON" | "MANUAL";
  createdAt: string;
};

type BroadcastRecipientInput = {
  phoneNumber: string;
  name?: string;
  variables?: Record<string, string>;
};

type BroadcastPage<T> = { total: number; page: number; take: number; items: T[] };

/** Segmento do disparo com o mapeamento das variáveis; o servidor resolve as pessoas. */
type BroadcastSegmentInput = {
  segmentId?: string;
  rules?: SegmentRules;
  // Mesmo formato do passo de variáveis: { "body.1": { source: { kind: "firstName" }, fallback: "" } }
  mapping: Record<string, unknown>;
};

type BroadcastAudiencePreviewInput = {
  templateId: string;
  segment?: BroadcastSegmentInput;
  // Telefones já conferidos da planilha e da lista colada
  phones?: string[];
  frequencyCapDays?: number;
};

type BroadcastAudiencePreview = {
  segment: {
    total: number;
    ready: number;
    noPhone: number;
    invalid: number;
    missingVariables: number;
    sample: { phoneNumber: string; name: string | null; variables: Record<string, string> } | null;
  } | null;
  invalid: number;
  duplicates: number;
  optedOut: number;
  frequencyCap: number;
  willReceive: number;
};
