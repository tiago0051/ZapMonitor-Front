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
  // Ligação pelo WhatsApp; o conteúdo é a WhatsappCall
  CALL = "call",
  // Pedido para o contato autorizar ligações e a resposta dele; o conteúdo é texto
  CALL_PERMISSION_REQUEST = "call_permission_request",
  CALL_PERMISSION_REPLY = "call_permission_reply",
}
