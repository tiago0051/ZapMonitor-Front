import api from "./api";

export const flowService = {
  findAll: async ({ params }: FindAllFlowsRequestData): Promise<Flow[]> => {
    const response = await api.get<Flow[]>(`/client/${params.clientId}/flow`);
    return response.data;
  },

  findById: async ({ params }: FindFlowByIdRequestData): Promise<Flow> => {
    const response = await api.get<Flow>(`/client/${params.clientId}/flow/${params.flowId}`);
    return response.data;
  },

  create: async ({ params, body }: CreateFlowRequestData): Promise<Flow> => {
    const response = await api.post(`/client/${params.clientId}/flow`, body);
    return response.data;
  },

  update: async ({ params, body }: UpdateFlowRequestData): Promise<Flow> => {
    const response = await api.put(`/client/${params.clientId}/flow/${params.flowId}`, body);
    return response.data;
  },

  publish: async ({ params, body }: PublishFlowRequestData): Promise<Flow> => {
    const response = await api.put(`/client/${params.clientId}/flow/${params.flowId}/publish`, body);
    return response.data;
  },

  discardDraft: async ({ params }: FindFlowByIdRequestData): Promise<Flow> => {
    const response = await api.delete(`/client/${params.clientId}/flow/${params.flowId}/draft`);
    return response.data;
  },

  findVersions: async ({ params }: FindFlowByIdRequestData): Promise<FlowVersion[]> => {
    const response = await api.get<FlowVersion[]>(`/client/${params.clientId}/flow/${params.flowId}/version`);
    return response.data;
  },

  restoreVersion: async ({ params }: RestoreFlowVersionRequestData): Promise<Flow> => {
    const response = await api.post(`/client/${params.clientId}/flow/${params.flowId}/version/${params.versionId}/restore`);
    return response.data;
  },

  duplicate: async ({ params, body }: DuplicateFlowRequestData): Promise<Flow> => {
    const response = await api.post(`/client/${params.clientId}/flow/${params.flowId}/duplicate`, body);
    return response.data;
  },

  findTestContacts: async ({ params }: FindFlowByIdRequestData): Promise<FlowTestContact[]> => {
    const response = await api.get<FlowTestContact[]>(`/client/${params.clientId}/flow/${params.flowId}/test-contact`);
    return response.data;
  },

  addTestContact: async ({ params, body }: CreateFlowTestContactRequestData): Promise<FlowTestContact> => {
    const response = await api.post(`/client/${params.clientId}/flow/${params.flowId}/test-contact`, body);
    return response.data;
  },

  deleteTestContact: async ({ params }: FlowTestContactRequestData): Promise<void> => {
    await api.delete(`/client/${params.clientId}/flow/${params.flowId}/test-contact/${params.testContactId}`);
  },

  restartTest: async ({ params }: FlowTestContactRequestData): Promise<{ finished: boolean }> => {
    const response = await api.post(`/client/${params.clientId}/flow/${params.flowId}/test-contact/${params.testContactId}/restart`);
    return response.data;
  },

  simulate: async ({ params, body }: SimulateFlowRequestData): Promise<FlowSimulationResult> => {
    const response = await api.post(`/client/${params.clientId}/flow/${params.flowId}/simulate`, body, { timeout: 90000 });
    return response.data;
  },

  activate: async ({ params }: ToggleFlowRequestData): Promise<Flow> => {
    const response = await api.put(`/client/${params.clientId}/flow/${params.flowId}/activate`);
    return response.data;
  },

  deactivate: async ({ params }: ToggleFlowRequestData): Promise<Flow> => {
    const response = await api.put(`/client/${params.clientId}/flow/${params.flowId}/deactivate`);
    return response.data;
  },
};
