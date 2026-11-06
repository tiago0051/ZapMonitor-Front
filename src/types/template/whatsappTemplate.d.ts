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
