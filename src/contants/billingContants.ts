export const billingResources: BillingResource[] = [
  "ACTIVE_USERS",
  "WHATSAPP_NUMBERS",
  "MONTHLY_SERVICES",
  "STORAGE_GB",
  "AI_TOKENS",
  "API_ACCESS",
];

export const billingResourceLabel: Record<BillingResource, string> = {
  ACTIVE_USERS: "Usuários ativos",
  WHATSAPP_NUMBERS: "Números de WhatsApp",
  MONTHLY_SERVICES: "Atendimentos por mês",
  STORAGE_GB: "Armazenamento",
  AI_TOKENS: "Agentes de IA",
  API_ACCESS: "Acesso à API",
};

// Como uma unidade aparece na tabela de preços
export const billingResourceUnit: Record<BillingResource, string> = {
  ACTIVE_USERS: "por usuário",
  WHATSAPP_NUMBERS: "por número",
  MONTHLY_SERVICES: "por atendimento",
  STORAGE_GB: "por GB",
  AI_TOKENS: "por milhão de tokens",
  API_ACCESS: "por acesso",
};

// Recursos liga/desliga: quantidade 0 ou 1
export const billingFeatureResources: BillingResource[] = ["API_ACCESS"];

export const priceTableStatusLabel: Record<PriceTableStatus, string> = {
  IN_FORCE: "Em vigor",
  SCHEDULED: "Agendada",
  PAST: "Anterior",
};
