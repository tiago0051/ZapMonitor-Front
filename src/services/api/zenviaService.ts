import api from "./api";

export const zenviaService = {
  findAgentTool: async ({ params }: FindZenviaToolRequestData): Promise<ZenviaTool> => {
    const response = await api.get<ZenviaTool>(`/client/${params.clientId}/ai-agent/${params.aiAgentId}/tool/zenvia`);
    return response.data;
  },

  saveAgentTool: async ({ params, body }: SaveZenviaToolRequestData): Promise<ZenviaTool> => {
    const response = await api.put<ZenviaTool>(`/client/${params.clientId}/ai-agent/${params.aiAgentId}/tool/zenvia`, body);
    return response.data;
  },
};
