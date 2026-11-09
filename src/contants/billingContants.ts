export const billingResources: BillingResource[] = [
  "ACTIVE_USERS",
  "WHATSAPP_NUMBERS",
  "WHATSAPP_WEB_NUMBERS",
  "MONTHLY_SERVICES",
  "STORAGE_GB",
  "AI_TOKENS",
  "API_ACCESS",
  "CRM_ACCESS",
  "CRM_PIPELINES",
  "ADS_ACCESS",
  "ADS_ACCOUNTS",
  "EMAIL_SENDS",
];

export const billingResourceLabel: Record<BillingResource, string> = {
  ACTIVE_USERS: "Usuários ativos",
  WHATSAPP_NUMBERS: "Números de WhatsApp",
  WHATSAPP_WEB_NUMBERS: "Números de WhatsApp por QR code",
  MONTHLY_SERVICES: "Atendimentos por mês",
  STORAGE_GB: "Armazenamento",
  AI_TOKENS: "Agentes de IA",
  API_ACCESS: "Acesso à API",
  CRM_ACCESS: "Módulo CRM",
  CRM_PIPELINES: "Funis do CRM",
  ADS_ACCESS: "Módulo de anúncios",
  ADS_ACCOUNTS: "Contas de anúncio",
  EMAIL_SENDS: "E-mails por mês",
};

// Como uma unidade aparece na tabela de preços
export const billingResourceUnit: Record<BillingResource, string> = {
  ACTIVE_USERS: "por usuário",
  WHATSAPP_NUMBERS: "por número",
  WHATSAPP_WEB_NUMBERS: "por número",
  MONTHLY_SERVICES: "por atendimento",
  STORAGE_GB: "por GB",
  AI_TOKENS: "por milhão de tokens",
  API_ACCESS: "por acesso",
  CRM_ACCESS: "por acesso",
  CRM_PIPELINES: "por funil",
  ADS_ACCESS: "por acesso",
  ADS_ACCOUNTS: "por conta",
  EMAIL_SENDS: "por mil e-mails",
};

// Recursos liga/desliga: quantidade 0 ou 1
export const billingFeatureResources: BillingResource[] = ["API_ACCESS", "CRM_ACCESS", "ADS_ACCESS"];

export const priceTableStatusLabel: Record<PriceTableStatus, string> = {
  IN_FORCE: "Em vigor",
  SCHEDULED: "Agendada",
  PAST: "Anterior",
};
