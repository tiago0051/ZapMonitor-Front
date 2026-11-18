import parsePhoneNumberFromString from "libphonenumber-js";

export function isWhatsappWeb(configuration: Pick<WhatsappConfiguration, "provider">) {
  return configuration.provider === "WHATSAPP_WEB";
}

// Número por QR code ainda não lido fica sem telefone (o phoneNumberId é só um marcador interno)
export function formatConfigurationPhoneNumber(configuration: Pick<WhatsappConfiguration, "phoneNumber">) {
  if (!configuration.phoneNumber) return "Aguardando conexão";
  return parsePhoneNumberFromString(configuration.phoneNumber)?.format("INTERNATIONAL") ?? configuration.phoneNumber;
}

export const whatsappProviderLabel: Record<WhatsappProvider, string> = {
  CLOUD_API: "API oficial",
  WHATSAPP_WEB: "QR code",
};

export const whatsappWebStatusInfo: Record<
  WhatsappWebConnectionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  CONNECTED: { label: "Conectado", variant: "default" },
  PENDING: { label: "Aguardando leitura", variant: "outline" },
  DISCONNECTED: { label: "Desconectado", variant: "destructive" },
  LOGGED_OUT: { label: "Desconectado do celular", variant: "secondary" },
};

export const WHATSAPP_WEB_TEMPLATE_HINT = "Números por QR code não enviam modelos";

// Qualidade do número na Meta, pelas reclamações e bloqueios das pessoas nos últimos 7 dias
export const whatsappQualityInfo: Record<WhatsappQualityRating, { label: string; className: string; hint: string }> = {
  GREEN: {
    label: "Verde",
    className: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
    hint: "Qualidade alta: as pessoas recebem bem as mensagens.",
  },
  YELLOW: {
    label: "Amarela",
    className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    hint: "Qualidade média: algumas pessoas bloquearam ou denunciaram. Reduza disparos e reveja os textos.",
  },
  RED: {
    label: "Vermelha",
    className: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    hint: "Qualidade baixa: muitas pessoas bloquearam ou denunciaram. Pare os disparos para o número não ser restrito.",
  },
  UNKNOWN: {
    label: "Sem nota",
    className: "text-muted-foreground",
    hint: "A Meta ainda não deu nota ao número (normal em números novos ou com poucas mensagens).",
  },
};

// Status do número na Meta que pedem atenção; CONNECTED não aparece
export const whatsappMetaStatusLabel: Record<string, string> = {
  PENDING: "Pendente na Meta",
  FLAGGED: "Sinalizado pela Meta",
  RESTRICTED: "Restrito pela Meta",
  BANNED: "Bloqueado pela Meta",
  DISCONNECTED: "Desconectado da Meta",
  DELETED: "Excluído na Meta",
  RATE_LIMITED: "Envios limitados",
  MIGRATED: "Migrado",
  UNVERIFIED: "Não verificado",
};

/** Limite de conversas que o número pode iniciar em 24h, em texto para o usuário. */
export const formatMessagingLimit = (configuration: Pick<WhatsappConfiguration, "messagingLimit" | "messagingLimitTier">) => {
  if (configuration.messagingLimit) return `Até ${configuration.messagingLimit.toLocaleString("pt-BR")} conversas em 24h`;
  if (configuration.messagingLimitTier?.toUpperCase() === "TIER_UNLIMITED") return "Sem limite de conversas";

  return null;
};
