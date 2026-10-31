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

  activate: async ({ params }: ToggleFlowRequestData): Promise<Flow> => {
    const response = await api.put(`/client/${params.clientId}/flow/${params.flowId}/activate`);
    return response.data;
  },

  deactivate: async ({ params }: ToggleFlowRequestData): Promise<Flow> => {
    const response = await api.put(`/client/${params.clientId}/flow/${params.flowId}/deactivate`);
    return response.data;
  },
};
