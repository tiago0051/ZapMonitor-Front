import api from "./api";

const base = (clientId: string) => `/client/${clientId}/email`;

export const emailSendingService = {
  findSenders: async (clientId: string): Promise<EmailSender[]> => {
    const response = await api.get(`${base(clientId)}/sender`);
    return response.data;
  },

  createSender: async (
    clientId: string,
    body: { domain: string; fromLocalPart: string; fromName: string; replyTo?: string },
  ): Promise<EmailSender> => {
    const response = await api.post(`${base(clientId)}/sender`, body);
    return response.data;
  },

  updateSender: async (clientId: string, senderId: string, body: { fromName: string; replyTo?: string | null }): Promise<EmailSender> => {
    const response = await api.put(`${base(clientId)}/sender/${senderId}`, body);
    return response.data;
  },

  // Consulta o SES para ver se os registros DNS já valem
  verifySender: async (clientId: string, senderId: string): Promise<EmailSender> => {
    const response = await api.post(`${base(clientId)}/sender/${senderId}/verify`);
    return response.data;
  },

  deleteSender: async (clientId: string, senderId: string): Promise<void> => {
    await api.delete(`${base(clientId)}/sender/${senderId}`);
  },

  sendTest: async (clientId: string, senderId: string, to: string): Promise<{ deliveryId: string }> => {
    const response = await api.post(`${base(clientId)}/sender/${senderId}/test`, { to });
    return response.data;
  },

  findSuppressions: async (clientId: string, queries: { page?: number; take?: number; search?: string }): Promise<EmailSuppressionPage> => {
    const response = await api.get(`${base(clientId)}/suppression`, { params: queries });
    return response.data;
  },

  addSuppression: async (clientId: string, email: string): Promise<void> => {
    await api.post(`${base(clientId)}/suppression`, { email });
  },

  removeSuppression: async (clientId: string, id: string): Promise<void> => {
    await api.delete(`${base(clientId)}/suppression/${id}`);
  },
};
