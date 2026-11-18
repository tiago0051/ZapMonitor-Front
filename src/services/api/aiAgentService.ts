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

  // Conversa de teste com as instruções da tela; nada vai para o WhatsApp
  test: async ({ params, body }: TestAiAgentRequestData): Promise<AiAgentTestResult> => {
    const response = await api.post<AiAgentTestResult>(`/client/${params.clientId}/ai-agent/test`, body);
    return response.data;
  },

  findKnowledge: async (clientId: string, aiAgentId: string): Promise<AiAgentKnowledge> =>
    (await api.get<AiAgentKnowledge>(`/client/${clientId}/ai-agent/${aiAgentId}/knowledge`)).data,

  saveKnowledgeQa: async (
    clientId: string,
    aiAgentId: string,
    body: { question: string; answer: string },
    sourceId?: string,
  ): Promise<AiAgentKnowledgeSource> => {
    const base = `/client/${clientId}/ai-agent/${aiAgentId}/knowledge/qa`;
    const response = sourceId ? await api.put(`${base}/${sourceId}`, body) : await api.post(base, body);
    return response.data;
  },

  addKnowledgeFile: async (clientId: string, aiAgentId: string, file: File): Promise<AiAgentKnowledgeSource> => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post(`/client/${clientId}/ai-agent/${aiAgentId}/knowledge/file`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  addKnowledgeUrl: async (clientId: string, aiAgentId: string, url: string): Promise<AiAgentKnowledgeSource> =>
    (await api.post(`/client/${clientId}/ai-agent/${aiAgentId}/knowledge/url`, { url })).data,

  deleteKnowledge: async (clientId: string, aiAgentId: string, sourceId: string): Promise<void> => {
    await api.delete(`/client/${clientId}/ai-agent/${aiAgentId}/knowledge/${sourceId}`);
  },

  findUsage: async (clientId: string, id: string): Promise<ResourceUsage> => {
    const response = await api.get<ResourceUsage>(`/client/${clientId}/ai-agent/${id}/usage`);
    return response.data;
  },
};
