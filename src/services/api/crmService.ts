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

  // Sem includeContactFields, só os campos dos negócios
  findAllCrmFields: async ({
    params,
    includeContactFields,
  }: FindAllLostReasonsRequestData & { includeContactFields?: boolean }): Promise<CrmField[]> => {
    const response = await api.get<CrmField[]>(`/client/${params.clientId}/crm/field`, {
      params: includeContactFields ? { scope: "ALL" } : undefined,
    });
    return response.data;
  },

  createCrmField: async ({ params, body }: CreateCrmFieldRequestData): Promise<CrmField> => {
    const response = await api.post(`/client/${params.clientId}/crm/field`, body);
    return response.data;
  },

  updateCrmField: async ({ params, body }: UpdateCrmFieldRequestData): Promise<CrmField> => {
    const response = await api.put(`/client/${params.clientId}/crm/field/${params.fieldId}`, body);
    return response.data;
  },

  setCrmFieldActive: async ({ params, body }: SetCrmFieldActiveRequestData): Promise<CrmField> => {
    const response = await api.put(`/client/${params.clientId}/crm/field/${params.fieldId}/active`, body);
    return response.data;
  },

  analyzeDeal: async ({ params }: FindDealRequestData): Promise<Deal> => {
    const response = await api.post(`/client/${params.clientId}/crm/deal/${params.dealId}/ai-insight`);
    return response.data;
  },

  findDealTasks: async ({ params }: FindDealRequestData): Promise<DealTask[]> => {
    const response = await api.get<DealTask[]>(`/client/${params.clientId}/crm/deal/${params.dealId}/task`);
    return response.data;
  },

  findMyTasks: async ({ params }: FindAllLostReasonsRequestData): Promise<DealTask[]> => {
    const response = await api.get<DealTask[]>(`/client/${params.clientId}/crm/task/mine`);
    return response.data;
  },

  createDealTask: async ({ params, body }: CreateDealTaskRequestData): Promise<DealTask> => {
    const response = await api.post(`/client/${params.clientId}/crm/deal/${params.dealId}/task`, body);
    return response.data;
  },

  updateDealTask: async ({ params, body }: UpdateDealTaskRequestData): Promise<DealTask> => {
    const response = await api.put(`/client/${params.clientId}/crm/task/${params.taskId}`, body);
    return response.data;
  },

  setDealTaskCompleted: async ({ params, body }: SetDealTaskCompletedRequestData): Promise<DealTask> => {
    const response = await api.put(`/client/${params.clientId}/crm/task/${params.taskId}/completed`, body);
    return response.data;
  },

  deleteDealTask: async ({ params }: DeleteDealTaskRequestData): Promise<void> => {
    await api.delete(`/client/${params.clientId}/crm/task/${params.taskId}`);
  },

  findReport: async ({ params, queries }: FindCrmReportRequestData): Promise<CrmReport> => {
    const response = await api.get<CrmReport>(`/client/${params.clientId}/crm/report`, { params: queries });
    return response.data;
  },

  findAllLostReasons: async ({ params }: FindAllLostReasonsRequestData): Promise<LostReason[]> => {
    const response = await api.get<LostReason[]>(`/client/${params.clientId}/crm/lost-reason`);
    return response.data;
  },

  createLostReason: async ({ params, body }: CreateLostReasonRequestData): Promise<LostReason> => {
    const response = await api.post(`/client/${params.clientId}/crm/lost-reason`, body);
    return response.data;
  },

  updateLostReason: async ({ params, body }: UpdateLostReasonRequestData): Promise<LostReason> => {
    const response = await api.put(`/client/${params.clientId}/crm/lost-reason/${params.lostReasonId}`, body);
    return response.data;
  },

  setLostReasonActive: async ({ params, body }: SetLostReasonActiveRequestData): Promise<LostReason> => {
    const response = await api.put(`/client/${params.clientId}/crm/lost-reason/${params.lostReasonId}/active`, body);
    return response.data;
  },

  findBoard: async ({ params, queries }: FindDealBoardRequestData): Promise<Deal[]> => {
    const response = await api.get<Deal[]>(`/client/${params.clientId}/crm/deal`, { params: queries });
    return response.data;
  },

  findOriginCampaigns: async ({ params }: { params: { clientId: string; pipelineId: string } }): Promise<DealOriginCampaign[]> => {
    const response = await api.get<DealOriginCampaign[]>(`/client/${params.clientId}/crm/pipeline/${params.pipelineId}/origin-campaign`);
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

  linkDealContact: async ({ params, body }: { params: { clientId: string; dealId: string }; body: { phone: string } }): Promise<Deal> => {
    const response = await api.put(`/client/${params.clientId}/crm/deal/${params.dealId}/contact`, body);
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
