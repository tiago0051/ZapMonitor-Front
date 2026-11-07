import api from "./api";

const base = (clientId: string) => `/client/${clientId}/contact`;

export const contactService = {
  findAll: async (clientId: string, queries: { page?: number; take?: number; search?: string }): Promise<ContactPage> => {
    const response = await api.get(base(clientId), { params: queries });
    return response.data;
  },

  timeline: async (clientId: string, contactId: string, before?: string): Promise<ContactTimelinePage> => {
    const response = await api.get(`/client/${clientId}/contact/${contactId}/timeline`, { params: { before, take: 30 } });
    return response.data;
  },

  findOne: async (clientId: string, contactId: string): Promise<ContactDetail> => {
    const response = await api.get(`${base(clientId)}/${contactId}`);
    return response.data;
  },

  // Ficha da conversa aberta no atendimento (o id é o do contato do WhatsApp)
  findByConversation: async (clientId: string, conversationId: string): Promise<ContactDetail> => {
    const response = await api.get(`${base(clientId)}/conversation/${conversationId}`);
    return response.data;
  },

  findFields: async (clientId: string): Promise<CrmField[]> => {
    const response = await api.get(`${base(clientId)}/field`);
    return response.data;
  },

  create: async (
    clientId: string,
    body: { name?: string; phone?: string; email?: string; document?: string; notes?: string },
  ): Promise<ContactDetail> => {
    const response = await api.post(base(clientId), body);
    return response.data;
  },

  update: async (
    clientId: string,
    contactId: string,
    body: { name?: string | null; document?: string | null; notes?: string | null; customFields?: Record<string, string | number | null> },
  ): Promise<ContactDetail> => {
    const response = await api.put(`${base(clientId)}/${contactId}`, body);
    return response.data;
  },

  addPhone: async (clientId: string, contactId: string, body: { phone: string; label?: string }): Promise<ContactDetail> => {
    const response = await api.post(`${base(clientId)}/${contactId}/phone`, body);
    return response.data;
  },

  removePhone: async (clientId: string, contactId: string, phoneId: string): Promise<ContactDetail> => {
    const response = await api.delete(`${base(clientId)}/${contactId}/phone/${phoneId}`);
    return response.data;
  },

  setPrimaryPhone: async (clientId: string, contactId: string, phoneId: string): Promise<ContactDetail> => {
    const response = await api.put(`${base(clientId)}/${contactId}/phone/${phoneId}/primary`);
    return response.data;
  },

  addEmail: async (clientId: string, contactId: string, body: { email: string }): Promise<ContactDetail> => {
    const response = await api.post(`${base(clientId)}/${contactId}/email`, body);
    return response.data;
  },

  removeEmail: async (clientId: string, contactId: string, emailId: string): Promise<ContactDetail> => {
    const response = await api.delete(`${base(clientId)}/${contactId}/email/${emailId}`);
    return response.data;
  },

  setPrimaryEmail: async (clientId: string, contactId: string, emailId: string): Promise<ContactDetail> => {
    const response = await api.put(`${base(clientId)}/${contactId}/email/${emailId}/primary`);
    return response.data;
  },

  // Não é a mesma pessoa: a sugestão some e não volta
  dismissMergeSuggestion: async (clientId: string, contactId: string, suggestionId: string): Promise<ContactDetail> => {
    const response = await api.post(`${base(clientId)}/${contactId}/merge-suggestion/${suggestionId}/dismiss`);
    return response.data;
  },

  // Junta a ficha sourceId na contactId (que fica)
  merge: async (clientId: string, contactId: string, sourceId: string): Promise<ContactDetail> => {
    const response = await api.post(`${base(clientId)}/${contactId}/merge`, { sourceId });
    return response.data;
  },
};
