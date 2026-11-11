import api from "./api";

type PlatformParams = { params: { clientId: string; platform: AdPlatform } };

/** Conexão e contas do Google Ads (YouTube) e do TikTok; o resto do gestor fica em metaAdsService. */
export const adsPlatformService = {
  findConnection: async ({ params }: PlatformParams): Promise<AdPlatformConnection> => {
    const response = await api.get<AdPlatformConnection>(`/client/${params.clientId}/ads-platform/${params.platform}/connection`);
    return response.data;
  },

  connect: async ({ params, body }: PlatformParams & { body: { code: string } }): Promise<AdPlatformConnection> => {
    const response = await api.post<AdPlatformConnection>(`/client/${params.clientId}/ads-platform/${params.platform}/connection`, body);
    return response.data;
  },

  disconnect: async ({ params }: PlatformParams): Promise<void> => {
    await api.delete(`/client/${params.clientId}/ads-platform/${params.platform}/connection`);
  },

  findAvailableAccounts: async ({ params }: PlatformParams): Promise<PlatformAvailableAccount[]> => {
    const response = await api.get<PlatformAvailableAccount[]>(
      `/client/${params.clientId}/ads-platform/${params.platform}/available-account`,
    );
    return response.data;
  },

  linkAccount: async ({ params, body }: PlatformParams & { body: { externalId: string } }): Promise<AdAccount> => {
    const response = await api.post<AdAccount>(`/client/${params.clientId}/ads-platform/${params.platform}/account`, body);
    return response.data;
  },

  tiktokAuthorizeUrl: async ({ params, queries }: { params: { clientId: string }; queries: { redirectUri: string } }) => {
    const response = await api.get<{ url: string; state: string }>(`/client/${params.clientId}/ads-platform/tiktok/authorize-url`, {
      params: queries,
    });
    return response.data;
  },

  findLinks: async ({ params }: PlatformParams): Promise<AdTrackedLink[]> => {
    const response = await api.get<AdTrackedLink[]>(`/client/${params.clientId}/ads-platform/${params.platform}/link`);
    return response.data;
  },

  createLink: async ({
    params,
    body,
  }: PlatformParams & { body: { name: string; whatsappConfigurationId: string; message: string } }): Promise<AdTrackedLink> => {
    const response = await api.post<AdTrackedLink>(`/client/${params.clientId}/ads-platform/${params.platform}/link`, body);
    return response.data;
  },

  updateLink: async ({
    params,
    body,
  }: {
    params: { clientId: string; linkId: string };
    body: Partial<{ name: string; whatsappConfigurationId: string; message: string; active: boolean }>;
  }): Promise<AdTrackedLink> => {
    const response = await api.patch<AdTrackedLink>(`/client/${params.clientId}/ads-platform/link/${params.linkId}`, body);
    return response.data;
  },

  deleteLink: async ({ params }: { params: { clientId: string; linkId: string } }): Promise<void> => {
    await api.delete(`/client/${params.clientId}/ads-platform/link/${params.linkId}`);
  },

  findConversionSettings: async ({ params }: PlatformParams): Promise<PlatformConversionSettings> => {
    const response = await api.get<PlatformConversionSettings>(
      `/client/${params.clientId}/ads-platform/${params.platform}/conversion-settings`,
    );
    return response.data;
  },

  saveConversionSettings: async ({
    params,
    body,
  }: PlatformParams & {
    body: { enabled: boolean; adAccountId?: string | null; pixelCode?: string | null; testEventCode?: string | null };
  }): Promise<PlatformConversionSettings> => {
    const response = await api.put<PlatformConversionSettings>(
      `/client/${params.clientId}/ads-platform/${params.platform}/conversion-settings`,
      body,
    );
    return response.data;
  },

  createGoogleConversionActions: async ({
    params,
    body,
  }: {
    params: { clientId: string };
    body: { adAccountId: string };
  }): Promise<PlatformConversionSettings> => {
    const response = await api.post<PlatformConversionSettings>(`/client/${params.clientId}/ads-platform/google/conversion-actions`, body);
    return response.data;
  },

  findVideoCampaigns: async ({ params }: { params: { clientId: string; accountId: string } }): Promise<AdVideoCampaign[]> => {
    const response = await api.get<AdVideoCampaign[]>(`/client/${params.clientId}/ads-platform/account/${params.accountId}/video-campaign`);
    return response.data;
  },

  createVideoCampaign: async ({
    params,
    body,
  }: {
    params: { clientId: string; accountId: string };
    body: Omit<AdVideoCampaignRequest, "videos"> & { videos: { id: string; name?: string }[] };
  }): Promise<AdVideoCampaign> => {
    // A IA escreve os textos na mesma chamada
    const response = await api.post<AdVideoCampaign>(
      `/client/${params.clientId}/ads-platform/account/${params.accountId}/video-campaign`,
      body,
      {
        timeout: 120000,
      },
    );
    return response.data;
  },

  updateVideoCampaign: async ({
    params,
    body,
  }: {
    params: { clientId: string; campaignId: string };
    body: { plan?: Partial<AdVideoCampaignPlan> };
  }): Promise<AdVideoCampaign> => {
    const response = await api.patch<AdVideoCampaign>(`/client/${params.clientId}/ads-platform/video-campaign/${params.campaignId}`, body);
    return response.data;
  },

  regenerateVideoPlan: async ({ params }: { params: { clientId: string; campaignId: string } }): Promise<AdVideoCampaign> => {
    const response = await api.post<AdVideoCampaign>(
      `/client/${params.clientId}/ads-platform/video-campaign/${params.campaignId}/plan`,
      undefined,
      {
        timeout: 120000,
      },
    );
    return response.data;
  },

  publishVideoCampaign: async ({ params }: { params: { clientId: string; campaignId: string } }): Promise<AdVideoCampaign> => {
    const response = await api.post<AdVideoCampaign>(
      `/client/${params.clientId}/ads-platform/video-campaign/${params.campaignId}/publish`,
      undefined,
      {
        timeout: 300000,
      },
    );
    return response.data;
  },

  deleteVideoCampaign: async ({ params }: { params: { clientId: string; campaignId: string } }): Promise<void> => {
    await api.delete(`/client/${params.clientId}/ads-platform/video-campaign/${params.campaignId}`);
  },

  uploadVideo: async ({ params, file }: { params: { clientId: string; accountId: string }; file: File }) => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<{ id: string; name: string }>(
      `/client/${params.clientId}/ads-platform/account/${params.accountId}/video`,
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000,
      },
    );
    return response.data;
  },

  uploadLogo: async ({ params, file }: { params: { clientId: string; accountId: string }; file: File }) => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post<{ logoAsset: string }>(
      `/client/${params.clientId}/ads-platform/account/${params.accountId}/logo`,
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },

  writeVideoScripts: async ({ params, body }: { params: { clientId: string; accountId: string }; body: { brief?: string } }) => {
    const response = await api.post<AdVideoScript[]>(
      `/client/${params.clientId}/ads-platform/account/${params.accountId}/video-scripts`,
      body,
      {
        timeout: 120000,
      },
    );
    return response.data;
  },

  findTikTokLeadSources: async ({ params }: { params: { clientId: string } }): Promise<TikTokLeadSource[]> => {
    const response = await api.get<TikTokLeadSource[]>(`/client/${params.clientId}/ads-platform/tiktok/lead-source`);
    return response.data;
  },

  linkTikTokLeadSource: async ({
    params,
    body,
  }: {
    params: { clientId: string };
    body: { advertiserId: string; pipelineId: string | null; stageId: string | null };
  }): Promise<TikTokLeadSource> => {
    const response = await api.post<TikTokLeadSource>(`/client/${params.clientId}/ads-platform/tiktok/lead-source`, body);
    return response.data;
  },

  unlinkTikTokLeadSource: async ({ params }: { params: { clientId: string; sourceId: string } }): Promise<void> => {
    await api.delete(`/client/${params.clientId}/ads-platform/tiktok/lead-source/${params.sourceId}`);
  },

  importTikTokLead: async ({ params, body }: { params: { clientId: string }; body: { leadId: string } }) => {
    const response = await api.post<{ id: string; status: string }>(`/client/${params.clientId}/ads-platform/tiktok/lead/import`, body);
    return response.data;
  },

  authorizeSparkPost: async ({ params, body }: { params: { clientId: string; accountId: string }; body: { authCode: string } }) => {
    const response = await api.post<AdVideoCampaignVideo>(
      `/client/${params.clientId}/ads-platform/account/${params.accountId}/spark-post`,
      body,
    );
    return response.data;
  },

  findVideoPilot: async ({ params }: { params: { clientId: string; accountId: string } }) => {
    const response = await api.get<{ enabled: boolean }>(`/client/${params.clientId}/ads-platform/account/${params.accountId}/video-pilot`);
    return response.data;
  },

  setVideoPilot: async ({ params, body }: { params: { clientId: string; accountId: string }; body: { enabled: boolean } }) => {
    const response = await api.put<{ enabled: boolean }>(
      `/client/${params.clientId}/ads-platform/account/${params.accountId}/video-pilot`,
      body,
    );
    return response.data;
  },

  findVideoGenerations: async ({ params }: { params: { clientId: string; accountId: string } }): Promise<AdVideoGeneration[]> => {
    const response = await api.get<AdVideoGeneration[]>(
      `/client/${params.clientId}/ads-platform/account/${params.accountId}/video-generation`,
    );
    return response.data;
  },

  generateVideo: async ({
    params,
    body,
  }: {
    params: { clientId: string; accountId: string };
    body: { script: AdVideoScript; businessName?: string };
  }): Promise<AdVideoGeneration> => {
    const response = await api.post<AdVideoGeneration>(
      `/client/${params.clientId}/ads-platform/account/${params.accountId}/video-generation`,
      body,
    );
    return response.data;
  },

  sendGeneratedVideo: async ({ params }: { params: { clientId: string; generationId: string } }) => {
    const response = await api.post<AdVideoCampaignVideo>(
      `/client/${params.clientId}/ads-platform/video-generation/${params.generationId}/send`,
      undefined,
      {
        timeout: 600000,
      },
    );
    return response.data;
  },
};
