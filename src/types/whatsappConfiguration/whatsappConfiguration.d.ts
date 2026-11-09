type WhatsappConfiguration = {
  id: string;
  phoneNumber: string;
  phoneNumberId: string;
  webhookSecret: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
  provider: WhatsappProvider;
  // Só números por QR code têm conexão própria; nulo na API oficial
  connectionStatus: WhatsappWebConnectionStatus | null;
  connectionError: string | null;
  connectedAt: string | null;
};

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
