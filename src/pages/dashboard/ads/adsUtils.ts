// Nomes do Gerenciador de Anúncios para os valores que a Marketing API devolve
export const campaignObjectiveLabel: Record<string, string> = {
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_LEADS: "Cadastros",
  OUTCOME_APP_PROMOTION: "Promoção do app",
  OUTCOME_SALES: "Vendas",
};

export const optimizationGoalLabel: Record<string, string> = {
  CONVERSATIONS: "Conversas",
  LEAD_GENERATION: "Leads",
  OFFSITE_CONVERSIONS: "Conversões",
  LINK_CLICKS: "Cliques no link",
  LANDING_PAGE_VIEWS: "Visualizações da página",
  REACH: "Alcance",
  IMPRESSIONS: "Impressões",
  THRUPLAY: "ThruPlays",
  POST_ENGAGEMENT: "Engajamento",
  QUALITY_LEAD: "Leads qualificados",
  VALUE: "Valor",
};

export const destinationTypeLabel: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  MESSENGER: "Messenger",
  INSTAGRAM_DIRECT: "Direct do Instagram",
  MESSAGING_MESSENGER_WHATSAPP: "Messenger e WhatsApp",
  MESSAGING_INSTAGRAM_DIRECT_WHATSAPP: "Instagram e WhatsApp",
  ON_AD: "Formulário no anúncio",
  WEBSITE: "Site",
  APP: "App",
};

type StatusTone = "active" | "paused" | "problem" | "off";

// effective_status combina o status do próprio objeto com o dos pais e o da revisão
const effectiveStatus: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: "Ativo", tone: "active" },
  PAUSED: { label: "Pausado", tone: "paused" },
  CAMPAIGN_PAUSED: { label: "Campanha pausada", tone: "paused" },
  ADSET_PAUSED: { label: "Conjunto pausado", tone: "paused" },
  PENDING_REVIEW: { label: "Em análise", tone: "paused" },
  IN_PROCESS: { label: "Processando", tone: "paused" },
  WITH_ISSUES: { label: "Com problemas", tone: "problem" },
  DISAPPROVED: { label: "Reprovado", tone: "problem" },
  PENDING_BILLING_INFO: { label: "Sem pagamento", tone: "problem" },
  ARCHIVED: { label: "Arquivado", tone: "off" },
  DELETED: { label: "Excluído", tone: "off" },
};

export const effectiveStatusInfo = (status: string) => effectiveStatus[status] ?? { label: status, tone: "off" as StatusTone };

export const statusToneClassName: Record<StatusTone, string> = {
  active: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  paused: "bg-muted text-muted-foreground",
  problem: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  off: "bg-muted text-muted-foreground line-through",
};

export const accountStatusLabel: Record<number, string> = {
  1: "Ativa",
  2: "Desativada",
  3: "Pagamento pendente",
  7: "Em análise de risco",
  8: "Liquidação pendente",
  9: "Em período de carência",
  100: "Fechamento pendente",
  101: "Fechada",
};

export const syncStatusLabel: Record<AdSyncStatus, string> = {
  PENDING: "Aguardando",
  SYNCING: "Sincronizando",
  SUCCESS: "Sincronizada",
  FAILED: "Falhou",
};

/** Orçamentos chegam em centavos da moeda da conta. */
export const formatBudget = (cents: number | null, currency: string) =>
  cents === null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);

export const budgetLabel = (item: { dailyBudget: number | null; lifetimeBudget: number | null }, currency: string) => {
  if (item.dailyBudget !== null) return `${formatBudget(item.dailyBudget, currency)}/dia`;
  if (item.lifetimeBudget !== null) return `${formatBudget(item.lifetimeBudget, currency)} no total`;

  return null;
};

/** Valores do painel já vêm em unidades da moeda (não centavos). */
export const formatMoney = (value: number | null, currency: string) =>
  value === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);

export const formatCount = (value: number | null, maximumFractionDigits = 0) =>
  value === null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits });

/** Data aaaa-mm-dd de hoje no fuso da conta de anúncio. */
export const todayInTimeZone = (timeZone: string | null) => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone ?? "America/Sao_Paulo" }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  }
};

export const addDaysToDate = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().substring(0, 10);
};

/** dd/mm a partir de aaaa-mm-dd, sem passar pelo fuso do navegador. */
export const shortDate = (date: string) => `${date.substring(8, 10)}/${date.substring(5, 7)}`;

/** Variação percentual; nula quando não há base de comparação. */
export const percentChange = (value: number, base: number) => (base > 0 ? Math.round(((value - base) / base) * 100) : null);

export const reportLevelLabel: Record<AdReportLevel, string> = {
  campaign: "Campanhas",
  adset: "Conjuntos",
  ad: "Anúncios",
};

export const leadStatusInfo: Record<AdLeadStatus, { label: string; className: string }> = {
  PENDING: { label: "Processando", className: "bg-muted text-muted-foreground" },
  CREATED: { label: "Virou contato", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  NO_PHONE: { label: "Sem telefone", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  FAILED: { label: "Falhou", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
};

export const conversionStatusInfo: Record<ConversionEventStatus, { label: string; className: string }> = {
  PENDING: { label: "Na fila", className: "bg-muted text-muted-foreground" },
  SENT: { label: "Aceito pela Meta", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  FAILED: { label: "Falhou", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  SKIPPED: { label: "Não enviado", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
};

export const conversionChannelLabel: Record<ConversionChannel, string> = {
  WHATSAPP: "WhatsApp",
  LEAD_FORM: "Formulário",
};

export const suggestionPriorityInfo: Record<AdSuggestionPriority, { label: string; className: string }> = {
  HIGH: { label: "Alta", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  MEDIUM: { label: "Média", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  LOW: { label: "Baixa", className: "bg-muted text-muted-foreground" },
};

export const suggestionStatusLabel: Record<AdSuggestionStatus, string> = {
  OPEN: "Abertas",
  ACCEPTED: "Aceitas",
  POSTPONED: "Adiadas",
  REJECTED: "Recusadas",
};

export const suggestionSourceLabel: Record<AdSuggestionSource, string> = {
  AUDIT: "Auditoria",
  DAILY: "Análise diária",
  CHAT: "Conversa",
};

export const targetLevelLabel: Record<AdTargetLevel, string> = {
  account: "Conta",
  campaign: "Campanha",
  adset: "Conjunto",
  ad: "Anúncio",
};

/** Descrição da mudança que a aplicação com aprovação vai fazer. */
export const suggestionActionLabel = (action: AdSuggestion["action"], currency: string) => {
  switch (action?.type) {
    case "PAUSE":
      return "Pausar";
    case "SET_DAILY_BUDGET":
      return `Orçamento diário para ${formatMoney(action.value ?? null, currency)}`;
    case "ENABLE_ADVANTAGE_AUDIENCE":
      return "Ligar o público Advantage+";
    case "ENABLE_ADVANTAGE_PLACEMENTS":
      return "Ligar os posicionamentos Advantage+";
    case "EXCLUDE_AUDIENCE":
      return "Excluir um público";
    default:
      return "Mudança manual";
  }
};
