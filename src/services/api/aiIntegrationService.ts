import api from "./api";

const baseUrl = (clientId: string) => `/client/${clientId}/ai/integrations`;

export const aiIntegrationService = {
  findAllProviders: async ({ params }: FindAllAiIntegrationProvidersRequestData): Promise<AiIntegrationProvider[]> => {
    const response = await api.get(`${baseUrl(params.clientId)}/providers`);
    return response.data;
  },
  findAll: async ({ params }: FindAllAiIntegrationsRequestData): Promise<AiIntegration[]> => {
    const response = await api.get(baseUrl(params.clientId));
    return response.data;
  },
  upsert: async ({ params, body }: UpsertAiIntegrationRequestData): Promise<AiIntegration> => {
    const response = await api.put(`${baseUrl(params.clientId)}/${params.provider}`, body);
    return response.data;
  },
  toggle: async ({ params, enabled }: ToggleAiIntegrationRequestData): Promise<AiIntegration> => {
    const response = await api.put(`${baseUrl(params.clientId)}/${params.provider}/${enabled ? "enable" : "disable"}`);
    return response.data;
  },
  toggleTool: async ({ params, enabled }: ToggleAiIntegrationToolRequestData): Promise<AiIntegration> => {
    const response = await api.put(
      `${baseUrl(params.clientId)}/${params.provider}/tools/${encodeURIComponent(params.toolName)}/${enabled ? "enable" : "disable"}`,
    );
    return response.data;
  },
  test: async ({ params }: TestAiIntegrationRequestData): Promise<void> => {
    await api.post(`${baseUrl(params.clientId)}/${params.provider}/test`);
  },
  delete: async ({ params }: DeleteAiIntegrationRequestData): Promise<void> => {
    await api.delete(`${baseUrl(params.clientId)}/${params.provider}`);
  },
};
