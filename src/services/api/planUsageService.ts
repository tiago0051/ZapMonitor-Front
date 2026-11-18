import api from "./api";

export const planUsageService = {
  findOverview: async (clientId: string): Promise<PlanUsage> => {
    const response = await api.get<PlanUsage>(`/client/${clientId}/plan-usage`);
    return response.data;
  },

  findAiStatus: async (clientId: string): Promise<AiUsageStatus> => {
    const response = await api.get<AiUsageStatus>(`/client/${clientId}/plan-usage/ai-status`);
    return response.data;
  },
};
