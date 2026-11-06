import api from "./api";

const base = (clientId: string) => `/client/${clientId}/broadcast`;

export const broadcastService = {
  findAll: async (clientId: string, queries: { page?: number; take?: number; status?: string }): Promise<BroadcastPage<Broadcast>> => {
    const response = await api.get(base(clientId), { params: queries });
    return response.data;
  },

  findOne: async (clientId: string, broadcastId: string): Promise<Broadcast> => {
    const response = await api.get(`${base(clientId)}/${broadcastId}`);
    return response.data;
  },

  findRecipients: async (
    clientId: string,
    broadcastId: string,
    queries: { page?: number; take?: number; status?: string; search?: string },
  ): Promise<BroadcastPage<BroadcastRecipient>> => {
    const response = await api.get(`${base(clientId)}/${broadcastId}/recipients`, { params: queries });
    return response.data;
  },

  create: async (
    clientId: string,
    body: {
      name: string;
      configurationId: string;
      templateId: string;
      headerFileId?: string;
      sendWindow?: BroadcastSendWindow;
      recipients: BroadcastRecipientInput[];
      start?: boolean;
    },
  ): Promise<Broadcast> => {
    const response = await api.post(base(clientId), body);
    return response.data;
  },

  addRecipients: async (
    clientId: string,
    broadcastId: string,
    recipients: BroadcastRecipientInput[],
  ): Promise<{ added: number; broadcast: Broadcast }> => {
    const response = await api.post(`${base(clientId)}/${broadcastId}/recipients`, { recipients });
    return response.data;
  },

  findAudience: async (
    clientId: string,
    body: { categoryIds?: string[]; pipelineId?: string; stageIds?: string[] },
  ): Promise<BroadcastAudienceContact[]> => {
    const response = await api.post(`${base(clientId)}/audience`, body);
    return response.data;
  },

  sendTest: async (
    clientId: string,
    body: { configurationId: string; templateId: string; phoneNumber: string; variables?: Record<string, string>; headerFileId?: string },
  ): Promise<{ text: string | null }> => {
    const response = await api.post(`${base(clientId)}/test`, body);
    return response.data;
  },

  action: async (clientId: string, broadcastId: string, action: "start" | "pause" | "cancel"): Promise<Broadcast> => {
    const response = await api.post(`${base(clientId)}/${broadcastId}/${action}`);
    return response.data;
  },

  schedule: async (clientId: string, broadcastId: string, scheduledAt: string): Promise<Broadcast> => {
    const response = await api.post(`${base(clientId)}/${broadcastId}/schedule`, { scheduledAt });
    return response.data;
  },

  unschedule: async (clientId: string, broadcastId: string): Promise<Broadcast> => {
    const response = await api.post(`${base(clientId)}/${broadcastId}/unschedule`);
    return response.data;
  },

  setSendWindow: async (clientId: string, broadcastId: string, sendWindow: BroadcastSendWindow | null): Promise<Broadcast> => {
    const response = await api.put(`${base(clientId)}/${broadcastId}/send-window`, { sendWindow });
    return response.data;
  },

  retryFailed: async (clientId: string, broadcastId: string): Promise<{ retried: number; broadcast: Broadcast }> => {
    const response = await api.post(`${base(clientId)}/${broadcastId}/retry-failed`);
    return response.data;
  },

  remove: async (clientId: string, broadcastId: string): Promise<void> => {
    await api.delete(`${base(clientId)}/${broadcastId}`);
  },

  findOptOuts: async (
    clientId: string,
    queries: { page?: number; take?: number; search?: string },
  ): Promise<BroadcastPage<BroadcastOptOut>> => {
    const response = await api.get(`${base(clientId)}/opt-out`, { params: queries });
    return response.data;
  },

  addOptOut: async (clientId: string, phoneNumber: string): Promise<BroadcastOptOut> => {
    const response = await api.post(`${base(clientId)}/opt-out`, { phoneNumber });
    return response.data;
  },

  removeOptOut: async (clientId: string, optOutId: string): Promise<void> => {
    await api.delete(`${base(clientId)}/opt-out/${optOutId}`);
  },
};
