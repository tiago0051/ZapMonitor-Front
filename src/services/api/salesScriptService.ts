import api from "./api";

const base = (clientId: string) => `/client/${clientId}/sales-script`;

export const salesScriptService = {
  findAll: async (clientId: string, includeArchived = false): Promise<SalesScript[]> =>
    (await api.get(base(clientId), { params: includeArchived ? { archived: "true" } : {} })).data,

  create: async (clientId: string, body: SalesScriptData): Promise<SalesScript> => (await api.post(base(clientId), body)).data,

  update: async (clientId: string, id: string, body: SalesScriptData): Promise<SalesScript> =>
    (await api.put(`${base(clientId)}/${id}`, body)).data,

  setArchived: async (clientId: string, id: string, archived: boolean): Promise<SalesScript> =>
    (await api.put(`${base(clientId)}/${id}/archived`, { archived })).data,

  /** A IA monta o roteiro a partir da oferta, do canal e do método; nada é salvo. */
  draft: async (
    clientId: string,
    body: { offerId?: string | null; channel?: SalesScriptChannel; method?: SalesScriptMethod; notes?: string | null },
  ): Promise<SalesScriptData> => (await api.post(`${base(clientId)}/draft`, body)).data,

  /** Revisão com base em conversas ganhas e perdidas; nada é salvo. */
  improve: async (clientId: string, id: string): Promise<SalesScriptImprovement> =>
    (await api.post(`${base(clientId)}/${id}/improve`)).data,

  /** Em que etapa a conversa está e o que mandar agora. */
  coach: async (clientId: string, salesScriptId: string, contactId: string): Promise<ScriptCoach> =>
    (await api.post(`${base(clientId)}/coach`, { salesScriptId, contactId })).data,

  findAgentScript: async (clientId: string, aiAgentId: string): Promise<{ salesScriptId: string | null }> =>
    (await api.get(`${base(clientId)}/ai-agent/${aiAgentId}`)).data,

  setAgentScript: async (clientId: string, aiAgentId: string, salesScriptId: string | null): Promise<{ salesScriptId: string | null }> =>
    (await api.put(`${base(clientId)}/ai-agent/${aiAgentId}`, { salesScriptId })).data,

  findDealScript: async (clientId: string, dealId: string): Promise<DealSalesScript> =>
    (await api.get(`/client/${clientId}/crm/deal/${dealId}/script`)).data,
};
