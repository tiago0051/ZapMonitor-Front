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
