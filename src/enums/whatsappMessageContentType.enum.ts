export enum WhatsappMessageContentType {
  TEXT = "text",
  AUDIO = "audio",
  IMAGE = "image",
  DOCUMENT = "document",
  VIDEO = "video",
  CONTACTS = "contacts",
  TEMPLATE = "template",
  STICKER = "sticker",
  REACTION = "reaction",
  // Mensagem com botões enviada pelo fluxo; o conteúdo chega como texto formatado
  INTERACTIVE = "interactive",
}
