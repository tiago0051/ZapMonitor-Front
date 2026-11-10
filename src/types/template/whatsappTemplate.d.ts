type WhatsappTemplateParameter = {
  /** Chave usada no envio: body.1, body.nome, header.1, button.0 */
  key: string;
  source: "HEADER" | "BODY" | "BUTTON";
  name: string;
  label: string;
  example: string | null;
};

type WhatsappTemplateButton = {
  type: string;
  text: string | null;
  url: string | null;
};

type WhatsappTemplate = {
  id: string;
  name: string;
  clientId: string;
  description: string | null;
  language: string;
  createdAt: string;
  /** Veio da WABA pela sincronização; falso no cadastro manual */
  synced: boolean;
  wabaId: string | null;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION" | string | null;
  status: string | null;
  rejectedReason: string | null;
  syncedAt: string | null;
  headerFormat: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | null;
  headerText: string | null;
  bodyText: string | null;
  footerText: string | null;
  buttons: WhatsappTemplateButton[];
  parameters: WhatsappTemplateParameter[];
  sendable: boolean;
  unavailableReason: string | null;
};

type WhatsappTemplateSyncResult = {
  wabas: number;
  created: number;
  updated: number;
  removed: number;
  configurationsWithoutWaba: string[];
  failures: { wabaId: string; message: string }[];
};

type WhatsappTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
type WhatsappTemplateDraftHeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
type WhatsappTemplateDraftButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";

type WhatsappTemplateDraftButton = {
  type: WhatsappTemplateDraftButtonType;
  text: string;
  url?: string | null;
  phoneNumber?: string | null;
  /** URL: final do link de exemplo; COPY_CODE: código de exemplo */
  example?: string | null;
};

/** Conteúdo do modelo montado na tela de criação */
type WhatsappTemplateDraft = {
  name: string;
  language: string;
  category: WhatsappTemplateCategory;
  header?: { format: WhatsappTemplateDraftHeaderFormat; text?: string | null } | null;
  body?: string | null;
  footer?: string | null;
  buttons?: WhatsappTemplateDraftButton[];
  /** Exemplo de cada variável: { "body.1": "Maria" } */
  examples?: Record<string, string>;
  authentication?: { securityRecommendation?: boolean; codeExpirationMinutes?: number | null; buttonText?: string | null } | null;
};

type WhatsappTemplateAssistIssue = {
  field: string;
  severity: "error" | "warning" | "tip";
  message: string;
};

type WhatsappTemplateAssistResult = {
  /** Categoria que a Meta deve aplicar ao conteúdo */
  category: WhatsappTemplateCategory;
  confidence: "high" | "medium" | "low";
  categoryReason: string;
  rejectionRisk: "low" | "medium" | "high";
  summary: string;
  issues: WhatsappTemplateAssistIssue[];
  suggestion: WhatsappTemplateDraft;
  /** Regras da Meta que a sugestão ainda não cumpre */
  suggestionErrors: string[];
};
