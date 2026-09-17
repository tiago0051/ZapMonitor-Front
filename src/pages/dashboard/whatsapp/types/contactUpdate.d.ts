export interface ContactUpdate {
  contact: Contact;
  isNewMessage: boolean;
}

export interface Contact {
  id: string;
  phoneNumber: string;
  name: string;
  surname: string;
  messageContent: string;
  messageContentType: string;
  messageType: number;
  messageCreatedAt: string;
  isRead: boolean;
  whatsappConfigurationId: string;
  categories: WhatsappMessageCategory[];
  clientId: string;
  serviceRepresentative: string;
  serviceCreatedAt: string;
  replyTimeExpiredAt: string;
}
