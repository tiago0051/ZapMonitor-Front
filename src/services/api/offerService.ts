import api from "./api";

const base = (clientId: string) => `/client/${clientId}/offer`;

export const offerService = {
  findAll: async (clientId: string, includeArchived = false): Promise<Offer[]> =>
    (await api.get(base(clientId), { params: includeArchived ? { archived: "true" } : {} })).data,

  find: async (clientId: string, id: string): Promise<OfferDetail> => (await api.get(`${base(clientId)}/${id}`)).data,

  create: async (clientId: string, body: OfferData): Promise<Offer> => (await api.post(base(clientId), body)).data,

  update: async (clientId: string, id: string, body: OfferData): Promise<Offer> => (await api.put(`${base(clientId)}/${id}`, body)).data,

  setArchived: async (clientId: string, id: string, archived: boolean): Promise<Offer> =>
    (await api.put(`${base(clientId)}/${id}/archived`, { archived })).data,

  /** A IA lê o texto, a página ou o arquivo e devolve um rascunho; nada é salvo. */
  draft: async (clientId: string, input: { text?: string; url?: string; file?: File | null }): Promise<OfferData> => {
    const form = new FormData();
    if (input.text?.trim()) form.append("text", input.text.trim());
    if (input.url?.trim()) form.append("url", input.url.trim());
    if (input.file) form.append("file", input.file);
    return (await api.post(`${base(clientId)}/draft`, form, { headers: { "Content-Type": "multipart/form-data" } })).data;
  },

  checkCoherence: async (clientId: string, id: string): Promise<OfferCoherence> =>
    (await api.post(`${base(clientId)}/${id}/coherence`)).data,

  findAgentOffers: async (clientId: string, aiAgentId: string): Promise<{ offerIds: string[] }> =>
    (await api.get(`${base(clientId)}/ai-agent/${aiAgentId}`)).data,

  setAgentOffers: async (clientId: string, aiAgentId: string, offerIds: string[]): Promise<{ offerIds: string[] }> =>
    (await api.put(`${base(clientId)}/ai-agent/${aiAgentId}`, { offerIds })).data,

  findDealItems: async (clientId: string, dealId: string): Promise<DealItems> =>
    (await api.get(`/client/${clientId}/crm/deal/${dealId}/items`)).data,

  replaceDealItems: async (clientId: string, dealId: string, items: DealItemInput[]): Promise<DealItems> =>
    (await api.put(`/client/${clientId}/crm/deal/${dealId}/items`, { items })).data,
};
