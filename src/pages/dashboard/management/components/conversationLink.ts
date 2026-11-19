/** Link da conversa no atendimento; o telefone ajuda a tela a achar o contato na aba "Todos". */
export const conversationUrl = (baseUrl: string, contact: Pick<ManagementContact, "id" | "phoneNumber">) =>
  `${baseUrl}/whatsapp?contactId=${contact.id}&phone=${encodeURIComponent(contact.phoneNumber)}`;
