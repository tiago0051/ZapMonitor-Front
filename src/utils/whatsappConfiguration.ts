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
