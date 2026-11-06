import api from "./api";

export type PushConfig = {
  // Nula quando o servidor não envia notificações em segundo plano
  publicKey: string | null;
  subscriptions: number;
};

export type BackgroundNotificationPreference = {
  queue: boolean;
  mine: boolean;
  assigned: boolean;
};

export const pushService = {
  findConfig: async (): Promise<PushConfig> => {
    const response = await api.get<PushConfig>("/push/config");
    return response.data;
  },

  // Com clientId, ativa as notificações daquele tenant neste aparelho; sem, só atualiza o aparelho
  saveSubscription: async (body: { endpoint: string; p256dh: string; auth: string; clientId?: string }): Promise<void> => {
    await api.post("/push/subscription", body);
  },

  // Com clientId, desliga só aquele tenant; sem, remove o aparelho
  deleteSubscription: async (endpoint: string, clientId?: string): Promise<void> => {
    await api.delete("/push/subscription", { data: { endpoint, clientId } });
  },

  findSubscriptionStatus: async (endpoint: string, clientId: string): Promise<{ subscribed: boolean }> => {
    const response = await api.post("/push/subscription/status", { endpoint, clientId });
    return response.data;
  },

  sendTest: async (clientId: string): Promise<{ delivered: number }> => {
    const response = await api.post("/push/test", { clientId });
    return response.data;
  },

  findPreference: async (clientId: string): Promise<BackgroundNotificationPreference> => {
    const response = await api.get<BackgroundNotificationPreference>(`/client/${clientId}/notification-preference`);
    return response.data;
  },

  savePreference: async (clientId: string, body: BackgroundNotificationPreference): Promise<BackgroundNotificationPreference> => {
    const response = await api.put(`/client/${clientId}/notification-preference`, body);
    return response.data;
  },
};
