type WhatsappContactMessage = {
  id: string;
  phoneNumber: string;
  name: string;
  surname: string;
  messageContent: string;
  messageContentType: string;
  messageType: number;
  isRead: boolean;
  // Data da última mensagem da conversa, recebida ou enviada
  lastMessageAt: string;
  unreadCount: number;
  whatsappConfigurationId: string;
  categories: WhatsappMessageCategoryShort[];
  serviceRepresentative: string | null;
  serviceGroupId: string | null;
  // Valores de WhatsappServiceStatus; null quando o contato nunca teve atendimento
  serviceStatus: number | null;
  userIdInService: string | null;
  queueEnteredAt: string | null;
  replyTimeExpiredAt: string;
};
