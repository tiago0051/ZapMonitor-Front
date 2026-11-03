import api from "./api";

export const crmService = {
  findAllPipelines: async ({ params }: FindAllPipelinesRequestData): Promise<Pipeline[]> => {
    const response = await api.get<Pipeline[]>(`/client/${params.clientId}/crm/pipeline`);
    return response.data;
  },

  createPipeline: async ({ params, body }: CreatePipelineRequestData): Promise<Pipeline> => {
    const response = await api.post(`/client/${params.clientId}/crm/pipeline`, body);
    return response.data;
  },

  updatePipeline: async ({ params, body }: UpdatePipelineRequestData): Promise<Pipeline> => {
    const response = await api.put(`/client/${params.clientId}/crm/pipeline/${params.pipelineId}`, body);
    return response.data;
  },

  setPipelineActive: async ({ params, body }: SetPipelineActiveRequestData): Promise<Pipeline> => {
    const response = await api.put(`/client/${params.clientId}/crm/pipeline/${params.pipelineId}/active`, body);
    return response.data;
  },

  findBoard: async ({ params, queries }: FindDealBoardRequestData): Promise<Deal[]> => {
    const response = await api.get<Deal[]>(`/client/${params.clientId}/crm/deal`, { params: queries });
    return response.data;
  },

  findContactDeals: async ({ params }: FindContactDealsRequestData): Promise<Deal[]> => {
    const response = await api.get<Deal[]>(`/client/${params.clientId}/crm/contact/${params.contactId}/deal`);
    return response.data;
  },

  findDeal: async ({ params }: FindDealRequestData): Promise<Deal> => {
    const response = await api.get<Deal>(`/client/${params.clientId}/crm/deal/${params.dealId}`);
    return response.data;
  },

  findDealEvents: async ({ params }: FindDealRequestData): Promise<DealEvent[]> => {
    const response = await api.get<DealEvent[]>(`/client/${params.clientId}/crm/deal/${params.dealId}/event`);
    return response.data;
  },

  createDeal: async ({ params, body }: CreateDealRequestData): Promise<Deal> => {
    const response = await api.post(`/client/${params.clientId}/crm/deal`, body);
    return response.data;
  },

  updateDeal: async ({ params, body }: UpdateDealRequestData): Promise<Deal> => {
    const response = await api.put(`/client/${params.clientId}/crm/deal/${params.dealId}`, body);
    return response.data;
  },

  moveDeal: async ({ params, body }: MoveDealRequestData): Promise<Deal> => {
    const response = await api.post(`/client/${params.clientId}/crm/deal/${params.dealId}/move`, body);
    return response.data;
  },

  transferDeal: async ({ params, body }: TransferDealRequestData): Promise<Deal> => {
    const response = await api.post(`/client/${params.clientId}/crm/deal/${params.dealId}/transfer`, body);
    return response.data;
  },

  reopenDeal: async ({ params, body }: ReopenDealRequestData): Promise<Deal> => {
    const response = await api.post(`/client/${params.clientId}/crm/deal/${params.dealId}/reopen`, body);
    return response.data;
  },
};
