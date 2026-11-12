import api from "./api";

const base = (clientId: string) => `/client/${clientId}/assistant`;

export const assistantService = {
  findTools: async (clientId: string): Promise<AssistantTool[]> => {
    const response = await api.get<AssistantTool[]>(`${base(clientId)}/tool`);
    return response.data;
  },

  findConversations: async (clientId: string): Promise<AssistantConversation[]> => {
    const response = await api.get<AssistantConversation[]>(`${base(clientId)}/conversation`);
    return response.data;
  },

  findConversation: async (clientId: string, conversationId: string): Promise<AssistantConversationDetail> => {
    const response = await api.get<AssistantConversationDetail>(`${base(clientId)}/conversation/${conversationId}`);
    return response.data;
  },

  deleteConversation: async (clientId: string, conversationId: string): Promise<void> => {
    await api.delete(`${base(clientId)}/conversation/${conversationId}`);
  },

  // Pode levar de 10 a 60 segundos: o assistente consulta o sistema antes de responder
  sendMessage: async (
    clientId: string,
    body: { conversationId?: string; message: string; page?: string; adAccountId?: string },
  ): Promise<AssistantSendMessageResult> => {
    const response = await api.post<AssistantSendMessageResult>(`${base(clientId)}/message`, body);
    return response.data;
  },

  findPlans: async (clientId: string, queries: { status?: AssistantPlanStatus; awaitingMe?: boolean } = {}): Promise<AssistantPlan[]> => {
    const response = await api.get<AssistantPlan[]>(`${base(clientId)}/plan`, { params: queries });
    return response.data;
  },

  findPlan: async (clientId: string, planId: string): Promise<AssistantPlan> => {
    const response = await api.get<AssistantPlan>(`${base(clientId)}/plan/${planId}`);
    return response.data;
  },

  decideStep: async (
    clientId: string,
    planId: string,
    stepId: string,
    body: { approved: boolean; reason?: string; confirmSensitive?: boolean },
  ): Promise<AssistantPlan> => {
    const response = await api.put<AssistantPlan>(`${base(clientId)}/plan/${planId}/step/${stepId}/decision`, body);
    return response.data;
  },

  editStepInput: async (clientId: string, planId: string, stepId: string, input: Record<string, unknown>): Promise<AssistantPlan> => {
    const response = await api.put<AssistantPlan>(`${base(clientId)}/plan/${planId}/step/${stepId}/input`, { input });
    return response.data;
  },

  undoStep: async (clientId: string, planId: string, stepId: string): Promise<AssistantPlan> => {
    const response = await api.post<AssistantPlan>(`${base(clientId)}/plan/${planId}/step/${stepId}/undo`);
    return response.data;
  },

  approvePending: async (clientId: string, planId: string): Promise<AssistantPlan> => {
    const response = await api.post<AssistantPlan>(`${base(clientId)}/plan/${planId}/approve-pending`);
    return response.data;
  },

  rejectPlan: async (clientId: string, planId: string, reason?: string): Promise<AssistantPlan> => {
    const response = await api.post<AssistantPlan>(`${base(clientId)}/plan/${planId}/reject`, { reason });
    return response.data;
  },

  executePlan: async (clientId: string, planId: string): Promise<AssistantPlan> => {
    const response = await api.post<AssistantPlan>(`${base(clientId)}/plan/${planId}/execute`);
    return response.data;
  },

  findSettings: async (clientId: string): Promise<AssistantSettings> => {
    const response = await api.get<AssistantSettings>(`${base(clientId)}/settings`);
    return response.data;
  },

  saveSettings: async (clientId: string, body: AssistantSettings): Promise<AssistantSettings> => {
    const response = await api.put<AssistantSettings>(`${base(clientId)}/settings`, body);
    return response.data;
  },

  findAudit: async (clientId: string, queries: { planId?: string } = {}): Promise<AssistantAudit[]> => {
    const response = await api.get<AssistantAudit[]>(`${base(clientId)}/audit`, { params: queries });
    return response.data;
  },

  findProjects: async (clientId: string): Promise<AssistantProject[]> => {
    const response = await api.get<AssistantProject[]>(`${base(clientId)}/project`);
    return response.data;
  },

  setProjectStatus: async (clientId: string, projectId: string, status: AssistantProjectStatus): Promise<AssistantProject> => {
    const response = await api.put<AssistantProject>(`${base(clientId)}/project/${projectId}/status`, { status });
    return response.data;
  },

  findRoutines: async (clientId: string): Promise<AssistantRoutine[]> => {
    const response = await api.get<AssistantRoutine[]>(`${base(clientId)}/routine`);
    return response.data;
  },

  setRoutineEnabled: async (clientId: string, routineId: string, enabled: boolean): Promise<AssistantRoutine> => {
    const response = await api.put<AssistantRoutine>(`${base(clientId)}/routine/${routineId}/enabled`, { enabled });
    return response.data;
  },
};
