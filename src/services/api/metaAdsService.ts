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

  findReport: async ({
    params,
    queries,
  }: MetaAdsAccountParams & { queries: { level: AdReportLevel; startDate: string; endDate: string } }): Promise<AdReport> => {
    const response = await api.get<AdReport>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/report`, { params: queries });
    return response.data;
  },

  findDailySummary: async ({ params, queries }: MetaAdsAccountParams & { queries: { date?: string } }): Promise<AdDailySummary> => {
    const response = await api.get<AdDailySummary>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/summary`, {
      params: queries,
    });
    return response.data;
  },

  findLeadPages: async ({ params }: MetaAdsClientParams): Promise<AdLeadPage[]> => {
    const response = await api.get<AdLeadPage[]>(`/client/${params.clientId}/meta-ads/lead-page`);
    return response.data;
  },

  findAvailablePages: async ({ params }: MetaAdsClientParams): Promise<AvailableAdPage[]> => {
    const response = await api.get<AvailableAdPage[]>(`/client/${params.clientId}/meta-ads/available-page`);
    return response.data;
  },

  linkLeadPage: async ({
    params,
    body,
  }: MetaAdsClientParams & { body: AdLeadPageTarget & { metaPageId: string } }): Promise<AdLeadPage> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/lead-page`, body);
    return response.data;
  },

  updateLeadPage: async ({
    params,
    body,
  }: { params: { clientId: string; leadPageId: string } } & { body: AdLeadPageTarget }): Promise<AdLeadPage> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/lead-page/${params.leadPageId}`, body);
    return response.data;
  },

  unlinkLeadPage: async ({ params }: { params: { clientId: string; leadPageId: string } }): Promise<void> => {
    await api.delete(`/client/${params.clientId}/meta-ads/lead-page/${params.leadPageId}`);
  },

  findLeads: async ({ params }: MetaAdsClientParams): Promise<AdLead[]> => {
    const response = await api.get<AdLead[]>(`/client/${params.clientId}/meta-ads/lead`);
    return response.data;
  },

  retryLead: async ({ params }: { params: { clientId: string; leadId: string } }): Promise<void> => {
    await api.post(`/client/${params.clientId}/meta-ads/lead/${params.leadId}/retry`);
  },
};
