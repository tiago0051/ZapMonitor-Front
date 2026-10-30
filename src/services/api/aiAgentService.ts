import api from "./api";

export const aiAgentService = {
  findAll: async ({ params }: FindAllAiAgentsRequestData): Promise<AiAgent[]> => {
    const response = await api.get<AiAgent[]>(`/client/${params.clientId}/ai-agent`);
    return response.data;
  },

  create: async ({ params, body }: CreateAiAgentRequestData): Promise<AiAgent> => {
    const response = await api.post(`/client/${params.clientId}/ai-agent`, body);
    return response.data;
  },

  update: async ({ params, body }: UpdateAiAgentRequestData): Promise<AiAgent> => {
    const response = await api.put(`/client/${params.clientId}/ai-agent/${params.aiAgentId}`, body);
    return response.data;
  },

  delete: async ({ params }: DeleteAiAgentRequestData): Promise<void> => {
    await api.delete(`/client/${params.clientId}/ai-agent/${params.aiAgentId}`);
  },

  generateSystemPrompt: async ({ params, body }: GenerateSystemPromptRequestData): Promise<{ systemPrompt: string }> => {
    const response = await api.post(`/client/${params.clientId}/ai-agent/prompt-assistant`, body);
    return response.data;
  },
};
