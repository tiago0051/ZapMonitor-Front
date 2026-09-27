type WhatsappContactMessage = {
  id: string;
  phoneNumber: string;
  name: string;
  surname: string;
  messageContent: string;
  messageContentType: string;
  messageType: number;
  isRead: boolean;
  whatsappConfigurationId: string;
  categories: WhatsappMessageCategoryShort[];
  serviceRepresentative: string | null;
  replyTimeExpiredAt: string;
};
