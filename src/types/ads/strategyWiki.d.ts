type StrategyCategory =
  | "FUNDAMENTALS"
  | "OFFER_AND_MESSAGE"
  | "CREATIVE"
  | "AUDIENCE_AND_FUNNEL"
  | "BUDGET_AND_SCALE"
  | "MEASUREMENT"
  | "CONVERSATION_SALES"
  | "PLATFORM"
  | "WEB_AND_ORGANIC"
  | "SEGMENT";

type StrategyChannel = "META" | "GOOGLE" | "TIKTOK" | "WEB";

type StrategyPurpose = "ANALYSIS" | "PLAN" | "CREATIVE" | "VIDEO" | "CHAT";

// Padrão do sistema, padrão editado pelo dono ou criado pelo dono
type StrategyArticleOrigin = "SYSTEM" | "EDITED" | "CUSTOM";

type StrategyArticleSource = { title: string; url: string };

type StrategyArticleContent = {
  title: string;
  category: StrategyCategory;
  // Vazio = vale para todos
  channels: StrategyChannel[];
  segments: string[];
  purposes: StrategyPurpose[];
  // 1 = essencial, entra primeiro no contexto da IA
  priority: number;
  summary: string;
  // Regras curtas que vão para a IA
  guidance: string[];
  // Markdown
  body: string;
  keywords: string[];
  sources: StrategyArticleSource[];
};

type StrategyArticle = StrategyArticleContent & {
  slug: string;
  origin: StrategyArticleOrigin;
  enabled: boolean;
  updatedAt: string | null;
};

type StrategyWiki = { segment: string | null; segmentLabel: string | null; articles: StrategyArticle[] };
