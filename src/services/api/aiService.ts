import api from "./api";

export const aiService = {
  getClientAiConfig: async ({ params }: GetClientAiConfigRequestData): Promise<AiConfig> => {
    const response = await api.get(`/client/${params.clientId}/ai/config`);
    return response.data;
  },
  createClientAiConfig: async ({ params, body }: CreateAiConfigRequestData): Promise<AiConfig> => {
    const response = await api.post(`/client/${params.clientId}/ai/config`, body);
    return response.data;
  },
  updateClientAiConfig: async ({ params, body }: UpdateAiConfigRequestData): Promise<AiConfig> => {
    const response = await api.put(`/client/${params.clientId}/ai/config`, body);
    return response.data;
  },
};
