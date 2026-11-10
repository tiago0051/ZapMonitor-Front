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
    case "ACTIVATE":
      return "Ativar";
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

export const changeStatusInfo: Record<AdChangeStatus, { label: string; className: string }> = {
  PENDING_APPROVAL: { label: "Esperando aprovação", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  APPLIED: { label: "Aplicada", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  FAILED: { label: "A Meta recusou", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  BLOCKED: { label: "Barrada por trava", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  REJECTED: { label: "Recusada", className: "bg-muted text-muted-foreground" },
  REVERTED: { label: "Desfeita", className: "bg-muted text-muted-foreground" },
  EXPIRED: { label: "Venceu", className: "bg-muted text-muted-foreground" },
};

/** Valor do antes ou do depois no campo que a mudança altera. */
export const changeStateLabel = (type: AdSuggestionActionType, state: AdChangeState | null, currency: string) => {
  if (!state) return "—";
  switch (type) {
    case "PAUSE":
    case "ACTIVATE":
      return state.status ? effectiveStatusInfo(state.status).label : "—";
    case "SET_DAILY_BUDGET":
      return state.dailyBudget == null ? "—" : `${formatMoney(state.dailyBudget, currency)}/dia`;
    case "ENABLE_ADVANTAGE_AUDIENCE":
      return state.advantageAudience ? "Público Advantage+ ligado" : "Público Advantage+ desligado";
    case "ENABLE_ADVANTAGE_PLACEMENTS":
      return state.placements?.length ? `Manuais: ${state.placements.join(", ")}` : "Posicionamentos Advantage+";
    case "EXCLUDE_AUDIENCE":
      return state.excludedAudienceIds?.length ? `Exclui ${state.excludedAudienceIds.length} público(s)` : "Sem exclusões";
    default:
      return "—";
  }
};

export const ruleMetricLabel: Record<AdRuleMetric, string> = {
  SPEND: "Gasto",
  CTR: "CTR (%)",
  CONVERSATIONS: "Conversas",
  COST_PER_CONVERSATION: "Custo por conversa",
  DEALS: "Negócios",
  COST_PER_DEAL: "Custo por negócio",
  WON_DEALS: "Vendas",
  COST_PER_WON_DEAL: "Custo por venda",
  ROAS: "ROAS",
};

export const ruleActionLabel: Record<AdRuleAction, string> = {
  PAUSE: "Pausar",
  INCREASE_BUDGET: "Aumentar o orçamento",
  DECREASE_BUDGET: "Reduzir o orçamento",
};

/**
 * Campo de data: no iPhone a data aparece por extenso ("4 de nov. de 2026") e quebrava em duas linhas no campo
 * estreito. No celular o campo tem altura normal e ocupa a largura disponível, sem quebrar o texto.
 */
export const dateInputClassName =
  "h-9 w-full min-w-0 appearance-none text-left sm:h-8 sm:w-36 [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:whitespace-nowrap";

/** Valor cru da Meta legível quando não há tradução: "LOWEST_COST_WITH_BID_CAP" → "Lowest cost with bid cap". */
export const humanizeMetaValue = (value: string | null | undefined) => {
  if (!value) return "—";
  const text = value.replaceAll("_", " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Tradução de um valor da Meta pelo mapa, com o valor humanizado como reserva. */
export const metaLabel = (labels: Record<string, string>, value: string | null | undefined) =>
  value ? (labels[value] ?? humanizeMetaValue(value)) : "—";

export const bidStrategyLabel: Record<string, string> = {
  LOWEST_COST_WITHOUT_CAP: "Menor custo (automático)",
  LOWEST_COST_WITH_BID_CAP: "Menor custo com lance máximo",
  COST_CAP: "Custo por resultado máximo",
  LOWEST_COST_WITH_MIN_ROAS: "Retorno mínimo (ROAS)",
  TARGET_COST: "Custo alvo",
};

export const billingEventLabel: Record<string, string> = {
  IMPRESSIONS: "Por impressão",
  LINK_CLICKS: "Por clique no link",
  CLICKS: "Por clique",
  THRUPLAY: "Por ThruPlay (vídeo assistido)",
  POST_ENGAGEMENT: "Por engajamento",
  PAGE_LIKES: "Por curtida na página",
  APP_INSTALLS: "Por instalação do app",
  LISTING_INTERACTION: "Por interação",
  PURCHASE: "Por compra",
};

export const callToActionLabel: Record<string, string> = {
  WHATSAPP_MESSAGE: "Enviar mensagem no WhatsApp",
  MESSAGE_PAGE: "Enviar mensagem",
  SEND_MESSAGE: "Enviar mensagem",
  LEARN_MORE: "Saiba mais",
  SHOP_NOW: "Comprar agora",
  SIGN_UP: "Cadastre-se",
  CONTACT_US: "Fale conosco",
  APPLY_NOW: "Candidate-se",
  GET_QUOTE: "Pedir orçamento",
  GET_OFFER: "Ver oferta",
  BOOK_TRAVEL: "Reservar",
  BOOK_NOW: "Reservar agora",
  SUBSCRIBE: "Assinar",
  DOWNLOAD: "Baixar",
  ORDER_NOW: "Pedir agora",
  CALL_NOW: "Ligar agora",
  NO_BUTTON: "Sem botão",
  INSTALL_MOBILE_APP: "Instalar o app",
  WATCH_MORE: "Assistir mais",
  SEE_MORE: "Ver mais",
};

export const audienceSubtypeLabel: Record<string, string> = {
  CUSTOM: "Lista de clientes",
  LOOKALIKE: "Semelhante",
  WEBSITE: "Visitantes do site",
  ENGAGEMENT: "Engajamento",
  APP: "Usuários do app",
  OFFLINE_CONVERSION: "Conversões offline",
  VIDEO: "Quem viu vídeos",
  LEAD_GENERATION: "Formulário de cadastro",
  IG_BUSINESS: "Perfil do Instagram",
  FB_EVENT: "Evento do Facebook",
  MESSENGER: "Conversas no Messenger",
  PAGE: "Página do Facebook",
};

/** delivery_status do público: a Meta devolve a descrição em inglês (ex.: "This audience is ready for use."). */
export const audienceDeliveryLabel = (status: string | null | undefined) => {
  if (!status) return "—";
  const text = status.toLowerCase();
  if (text.includes("too small") || text.includes("not large enough") || text.includes("not enough")) return "Público pequeno demais";
  if (text.includes("expired")) return "Vencido";
  if (text.includes("deleted")) return "Excluído";
  if (text.includes("being updated") || text.includes("populating") || text.includes("not ready")) return "Ainda preparando";
  if (text.includes("ready")) return "Pronto para uso";
  if (text.includes("not available") || text.includes("can't be used") || text.includes("cannot be used")) return "Não pode ser usado";
  // Sem tradução conhecida: mostra o texto da Meta
  return status;
};

export type GlossaryTerm =
  "CTR" | "ROAS" | "CPA" | "ADVANTAGE" | "CPC" | "CPM" | "SALES_SHARE" | "OPTIMIZATION" | "TEAM_HOURS" | "PROB_BEST";

/** Explicações curtas para as siglas da Meta, mostradas pelo botão "o que é isso". */
export const metricGlossary: Record<GlossaryTerm, { title: string; description: string }> = {
  CTR: {
    title: "CTR (taxa de cliques)",
    description: "De cada 100 pessoas que viram o anúncio, quantas clicaram. Quanto maior, mais o anúncio chama atenção.",
  },
  ROAS: {
    title: "ROAS (retorno sobre o gasto)",
    description: "Quanto voltou em vendas para cada R$ 1 gasto em anúncio. ROAS 3 = R$ 3 vendidos para cada R$ 1 investido.",
  },
  CPA: {
    title: "Custo por resultado",
    description:
      "Quanto custou, em média, cada resultado (conversa, cadastro ou venda): o gasto dividido pela quantidade de resultados. Quanto menor, melhor.",
  },
  ADVANTAGE: {
    title: "Advantage+",
    description:
      "Recursos automáticos da Meta: a própria Meta ajusta público, posicionamentos ou o criativo para achar quem tem mais chance de responder.",
  },
  CPC: {
    title: "CPC (custo por clique)",
    description: "Quanto custou, em média, cada clique no anúncio.",
  },
  CPM: {
    title: "CPM (custo por mil)",
    description: "Quanto custa mostrar o anúncio mil vezes.",
  },
  SALES_SHARE: {
    title: "Vende Nx a sua parte da verba",
    description:
      "Compara a fatia das vendas com a fatia do gasto. Se os anúncios com essa característica levaram 20% da verba e trouxeram 32% das vendas, eles vendem 1,6x a sua parte. 1x é a média; abaixo de 1x vendem menos do que custam.",
  },
  OPTIMIZATION: {
    title: "Otimizar por",
    description:
      "O que a Meta procura entregar. Por conversas, ela mostra o anúncio para quem tende a chamar no WhatsApp. Por vendas, ela usa as vendas marcadas como ganhas no CRM para achar quem tende a comprar; precisa de vendas suficientes toda semana para aprender.",
  },
  TEAM_HOURS: {
    title: "Só no horário da equipe",
    description:
      "Os anúncios param fora do horário em que a equipe atende, para ninguém chamar e ficar sem resposta. A Meta só permite isso com verba total e data de fim, por isso precisa de um prazo.",
  },
  PROB_BEST: {
    title: "Chance de ser o melhor",
    description:
      "Olhando as vendas e o gasto de cada lado até agora, quantas vezes em 100 este lado seria o que vende mais barato. Com poucas vendas as chances ficam parecidas; o teste só declara vencedor quando um lado passa de 95%, com pelo menos 10 vendas e 7 dias.",
  },
};
