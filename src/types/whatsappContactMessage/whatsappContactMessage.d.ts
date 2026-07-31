type WhatsappContactMessage = {
  id: string;
  phoneNumber: string;
  name: string;
  surname: string;
  messageContent: string;
  messageContentType: string;
  messageCreatedAt: string;
  messageType: number;
  isRead: boolean;
  whatsappConfigurationId: string;
  categories: WhatsappMessageCategory[];
  clientId: string;
  serviceRepresentative: string | null;
  serviceCreatedAt: string | null;
  replyTimeExpiredAt: string;
};
