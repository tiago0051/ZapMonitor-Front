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
  createdAt: string;
};
