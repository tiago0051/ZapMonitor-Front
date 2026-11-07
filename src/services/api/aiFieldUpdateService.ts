import api from "./api";

export const aiFieldUpdateService = {
  findByContact: async (clientId: string, contactId: string): Promise<AiFieldUpdate[]> => {
    const response = await api.get(`/client/${clientId}/contact/${contactId}/ai-update`);
    return response.data;
  },

  findByDeal: async (clientId: string, dealId: string): Promise<AiFieldUpdate[]> => {
    const response = await api.get(`/client/${clientId}/crm/deal/${dealId}/ai-update`);
    return response.data;
  },

  accept: async (clientId: string, id: string): Promise<void> => {
    await api.post(`/client/${clientId}/ai-update/${id}/accept`);
  },

  dismiss: async (clientId: string, id: string): Promise<void> => {
    await api.post(`/client/${clientId}/ai-update/${id}/dismiss`);
  },
};
