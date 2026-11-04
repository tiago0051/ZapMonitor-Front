import api from "./api";

type MetaAdsClientParams = { params: { clientId: string } };
type MetaAdsAccountParams = { params: { clientId: string; accountId: string } };

export const metaAdsService = {
  findConnection: async ({ params }: MetaAdsClientParams): Promise<MetaAdsConnection> => {
    const response = await api.get<MetaAdsConnection>(`/client/${params.clientId}/meta-ads/connection`);
    return response.data;
  },

  connect: async ({ params, body }: MetaAdsClientParams & { body: { code: string } }): Promise<MetaAdsConnection> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/connection`, body);
    return response.data;
  },

  disconnect: async ({ params }: MetaAdsClientParams): Promise<void> => {
    await api.delete(`/client/${params.clientId}/meta-ads/connection`);
  },

  findAvailableAccounts: async ({ params }: MetaAdsClientParams): Promise<AvailableAdAccount[]> => {
    const response = await api.get<AvailableAdAccount[]>(`/client/${params.clientId}/meta-ads/available-account`);
    return response.data;
  },

  linkAccount: async ({ params, body }: MetaAdsClientParams & { body: { metaAccountId: string } }): Promise<AdAccount> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account`, body);
    return response.data;
  },

  unlinkAccount: async ({ params }: MetaAdsAccountParams): Promise<void> => {
    await api.delete(`/client/${params.clientId}/meta-ads/account/${params.accountId}`);
  },

  syncAccount: async ({ params }: MetaAdsAccountParams): Promise<AdAccount> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/sync`);
    return response.data;
  },

  findStructure: async ({ params }: MetaAdsAccountParams): Promise<AdAccountStructure> => {
    const response = await api.get<AdAccountStructure>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/structure`);
    return response.data;
  },
};
