type WhatsappConfiguration = {
  id: string;
  phoneNumber: string;
  phoneNumberId: string;
  webhookSecret: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
  provider: WhatsappProvider;
  /** Conta do WhatsApp (WABA); preenchida na primeira mensagem recebida */
  wabaId?: string | null;
  // Só números por QR code têm conexão própria; nulo na API oficial
  connectionStatus: WhatsappWebConnectionStatus | null;
  connectionError: string | null;
  connectedAt: string | null;
  // Ligações pelo WhatsApp ligadas na Meta (só na API oficial)
  callingEnabled: boolean;
  // Saúde do número na Meta (só na API oficial), relida de hora em hora: status, qualidade e limite de conversas
  metaStatus: string | null;
  qualityRating: WhatsappQualityRating | null;
  messagingLimitTier: string | null;
  // Conversas que o número pode iniciar com pessoas diferentes em 24h; nulo quando ilimitado ou desconhecido
  messagingLimit: number | null;
  healthCheckedAt: string | null;
  // Motivo da última leitura na Meta que falhou
  healthError: string | null;
  // Problema de pagamento da conta do WhatsApp Business: a Meta recusa os modelos até regularizar
  paymentIssueAt?: string | null;
  paymentIssueMessage?: string | null;
  paymentIssueUrl?: string | null;
  // Só na listagem: fluxo de atendimento (active = fluxo de atendimento ativo) e grupo padrão do número
  flow?: { id: string; name: string; active: boolean } | null;
  serviceGroup?: { id: string; name: string; memberCount: number } | null;
};

type WhatsappQualityRating = "GREEN" | "YELLOW" | "RED" | "UNKNOWN";

// CLOUD_API: API oficial da Meta. WHATSAPP_WEB: número conectado por QR code (não oficial)
type WhatsappProvider = "CLOUD_API" | "WHATSAPP_WEB";

type WhatsappWebConnectionStatus = "PENDING" | "CONNECTED" | "DISCONNECTED" | "LOGGED_OUT";

type WhatsappWebStatus = {
  connectionStatus: WhatsappWebConnectionStatus;
  connectionError: string | null;
  connectedAt: string | null;
  phoneNumber: string;
  // Imagem pronta (data URL) enquanto aguarda a leitura; troca a cada ~20s
  qrCode: string | null;
};

type WhatsappConfigurationWebhook = {
  // URL que efetivamente recebe os eventos do número (a mais específica entre número, conta e aplicativo)
  effectiveUrl: string | null;
  urls: {
    application: string | null;
    whatsappBusinessAccount: string | null;
    phoneNumber: string | null;
  };
};

type WhatsappNumberLimit = {
  used: number;
  // Números que o plano permite; nulo quando o tenant não tem plano (sem limite)
  limit: number | null;
};

// used/limit contam só os números da API oficial; os por QR code têm limite próprio
type WhatsappNumberUsage = WhatsappNumberLimit & {
  whatsappWeb: WhatsappNumberLimit;
};

/** Número com problema de pagamento da conta do WhatsApp Business: os modelos são recusados até regularizar na Meta. */
type WhatsappPaymentIssue = {
  id: string;
  phoneNumber: string;
  since: string;
  message: string;
  billingUrl: string;
};
