export const STRATEGY_CATEGORY_LABEL: Record<StrategyCategory, string> = {
  FUNDAMENTALS: "Crescimento de marca",
  OFFER_AND_MESSAGE: "Oferta e mensagem",
  CREATIVE: "Criativos",
  AUDIENCE_AND_FUNNEL: "Público e funil",
  BUDGET_AND_SCALE: "Verba e escala",
  MEASUREMENT: "Medição",
  CONVERSATION_SALES: "Conversa e venda",
  PLATFORM: "Plataformas",
  WEB_AND_ORGANIC: "Site e orgânico",
  SEGMENT: "Segmentos",
};

export const STRATEGY_CATEGORIES = Object.keys(STRATEGY_CATEGORY_LABEL) as StrategyCategory[];

export const STRATEGY_CHANNEL_LABEL: Record<StrategyChannel, string> = {
  META: "Meta",
  GOOGLE: "YouTube",
  TIKTOK: "TikTok",
  WEB: "Site e redes",
};

export const STRATEGY_CHANNELS = Object.keys(STRATEGY_CHANNEL_LABEL) as StrategyChannel[];

export const STRATEGY_PURPOSE_LABEL: Record<StrategyPurpose, string> = {
  ANALYSIS: "Análise da conta",
  PLAN: "Plano de campanha",
  CREATIVE: "Textos e imagens",
  VIDEO: "Roteiros de vídeo",
  CHAT: "Conversa de estratégia",
};

export const STRATEGY_PURPOSES = Object.keys(STRATEGY_PURPOSE_LABEL) as StrategyPurpose[];

export const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Todas as palavras da busca aparecem no título, resumo, palavras-chave ou texto. */
export function matchesSearch(article: StrategyArticle, search: string) {
  const terms = normalizeText(search).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalizeText([article.title, article.summary, article.keywords.join(" "), article.body].join(" "));
  return terms.every((term) => haystack.includes(term));
}

/** Artigo vale para o canal (artigo sem canal vale para todos). */
export const matchesChannel = (article: StrategyArticle, channel: StrategyChannel | "ALL") =>
  channel === "ALL" || !article.channels.length || article.channels.includes(channel);

export const slugify = (text: string) =>
  normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
