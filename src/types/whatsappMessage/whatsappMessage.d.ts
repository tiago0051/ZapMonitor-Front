type WhatsappMessageReplyTo = {
  id: string;
  content: unknown;
  contentType: string;
  type: number;
};

type WhatsappMessage<C = unknown> = {
  id: string;
  content: C;
  transcribedContent?: string | null;
  // Legenda enviada junto da imagem, documento ou vídeo
  caption?: string | null;
  contentType: string;
  type: number;
  status: number;
  userName: string;
  contactReaction?: string | null;
  replyTo?: WhatsappMessageReplyTo | null;
  // Campanha que enviou a mensagem
  broadcast?: { id: string; name: string } | null;
  // Modelo enviado em partes; só em mensagens de modelo
  template?: WhatsappTemplateMessageView | null;
  createdAt: string;
};

type WhatsappTemplateMessageView = {
  name: string | null;
  // url nula quando o envio não guardou o link do arquivo
  media: { type: "IMAGE" | "VIDEO" | "DOCUMENT"; url: string | null; filename: string | null } | null;
  header: string | null;
  body: string | null;
  footer: string | null;
  // QUICK_REPLY, URL, PHONE_NUMBER, COPY_CODE...
  buttons: { type: string; text: string }[];
};
