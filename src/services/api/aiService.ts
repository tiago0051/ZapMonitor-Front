import api from "./api";

export const aiService = {
  getClientAiConfig: async ({ params }: { params: { clientId: string } }): Promise<AiConfig> => {
    const response = await api.get(`/client/${params.clientId}/ai/config`);
    return response.data;
  },
};
