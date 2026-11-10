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

  findAccountsForToken: async ({
    params,
    body,
  }: MetaAdsClientParams & { body: { accessToken: string } }): Promise<AvailableAdAccount[]> => {
    const response = await api.post<AvailableAdAccount[]>(`/client/${params.clientId}/meta-ads/token/available-account`, body);
    return response.data;
  },

  linkAccountWithToken: async ({
    params,
    body,
  }: MetaAdsClientParams & { body: { accessToken: string; metaAccountId: string } }): Promise<AdAccount> => {
    const response = await api.post<AdAccount>(`/client/${params.clientId}/meta-ads/token/account`, body);
    return response.data;
  },

  removeAccountToken: async ({ params }: MetaAdsAccountParams): Promise<AdAccount> => {
    const response = await api.delete<AdAccount>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/token`);
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

  importLead: async ({ params, body }: MetaAdsClientParams & { body: { metaLeadId: string } }): Promise<AdLead> => {
    const response = await api.post<AdLead>(`/client/${params.clientId}/meta-ads/lead/import`, body);
    return response.data;
  },

  setLeadPhone: async ({ params, body }: { params: { clientId: string; leadId: string }; body: { phone: string } }): Promise<AdLead> => {
    const response = await api.put<AdLead>(`/client/${params.clientId}/meta-ads/lead/${params.leadId}/phone`, body);
    return response.data;
  },

  findConversionSettings: async ({ params }: MetaAdsClientParams): Promise<ConversionSettings> => {
    const response = await api.get<ConversionSettings>(`/client/${params.clientId}/meta-ads/conversion-settings`);
    return response.data;
  },

  findSignal: async ({ params }: MetaAdsClientParams): Promise<AdSignalCalibration> =>
    (await api.get<AdSignalCalibration>(`/client/${params.clientId}/meta-ads/signal`)).data,

  recalibrateSignal: async ({ params }: MetaAdsClientParams): Promise<AdSignalCalibration> =>
    (await api.post<AdSignalCalibration>(`/client/${params.clientId}/meta-ads/signal/calibrate`)).data,

  findSignalReadiness: async (clientId: string, accountId: string): Promise<AdSignalReadiness[]> =>
    (await api.get<AdSignalReadiness[]>(`/client/${clientId}/meta-ads/account/${accountId}/signal-readiness`)).data,

  saveConversionSettings: async ({
    params,
    body,
  }: MetaAdsClientParams & { body: ConversionSettingsValues }): Promise<ConversionSettings> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/conversion-settings`, body);
    return response.data;
  },

  findConversionEvents: async ({ params }: MetaAdsClientParams): Promise<ConversionEvent[]> => {
    const response = await api.get<ConversionEvent[]>(`/client/${params.clientId}/meta-ads/conversion-event`);
    return response.data;
  },

  retryFailedConversionEvents: async ({ params }: MetaAdsClientParams): Promise<{ queued: number; expired: number }> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/conversion-event/retry-failed`);
    return response.data;
  },

  retryConversionEvent: async ({ params }: { params: { clientId: string; eventId: string } }): Promise<void> => {
    await api.post(`/client/${params.clientId}/meta-ads/conversion-event/${params.eventId}/retry`);
  },

  findAdvisorStatus: async ({ params }: MetaAdsAccountParams): Promise<AdAdvisorStatus> => {
    const response = await api.get<AdAdvisorStatus>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/advisor`);
    return response.data;
  },

  requestAudit: async ({ params }: MetaAdsAccountParams): Promise<AdAnalysis> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/analysis`);
    return response.data;
  },

  setDailyAnalysis: async ({ params, body }: MetaAdsAccountParams & { body: { enabled: boolean } }): Promise<AdAdvisorStatus> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/account/${params.accountId}/daily-analysis`, body);
    return response.data;
  },

  findEvidenceThresholds: async ({ params }: MetaAdsAccountParams): Promise<AdEvidenceThresholds> => {
    const response = await api.get(`/client/${params.clientId}/meta-ads/account/${params.accountId}/evidence-thresholds`);
    return response.data;
  },

  setEvidenceThresholds: async ({
    params,
    body,
  }: MetaAdsAccountParams & { body: AdEvidenceThresholds["custom"] }): Promise<AdEvidenceThresholds> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/account/${params.accountId}/evidence-thresholds`, body);
    return response.data;
  },

  findSuggestions: async ({ params, queries }: MetaAdsAccountParams & { queries: { status: string } }): Promise<AdSuggestion[]> => {
    const response = await api.get<AdSuggestion[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/suggestion`, {
      params: queries,
    });
    return response.data;
  },

  decideSuggestion: async ({
    params,
    body,
  }: {
    params: { clientId: string; suggestionId: string };
    body: { status: AdSuggestionStatus; note?: string | null; postponedUntil?: string | null };
  }): Promise<AdSuggestion> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/suggestion/${params.suggestionId}/decision`, body);
    return response.data;
  },

  findChats: async ({ params }: MetaAdsAccountParams): Promise<AdChat[]> => {
    const response = await api.get<AdChat[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/chat`);
    return response.data;
  },

  findChatConversation: async ({ params }: { params: { clientId: string; chatId: string } }): Promise<AdChatConversation> => {
    const response = await api.get<AdChatConversation>(`/client/${params.clientId}/meta-ads/chat/${params.chatId}`);
    return response.data;
  },

  sendChatMessage: async ({
    params,
    body,
  }: MetaAdsAccountParams & { body: { message: string; chatId: string | null } }): Promise<AdChatConversation> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/chat/message`, body);
    return response.data;
  },

  deleteChat: async ({ params }: { params: { clientId: string; chatId: string } }): Promise<void> => {
    await api.delete(`/client/${params.clientId}/meta-ads/chat/${params.chatId}`);
  },

  findChanges: async ({ params, queries }: MetaAdsAccountParams & { queries: { status?: string } }): Promise<AdChange[]> => {
    const response = await api.get<AdChange[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/change`, {
      params: queries,
    });
    return response.data;
  },

  // Muda o orçamento diário na hora, dentro das travas; fica no histórico de mudanças, com desfazer
  setBudget: async ({
    params,
    body,
  }: {
    params: { clientId: string; accountId: string };
    body: { level: "campaign" | "adset"; metaId: string; dailyBudget: number };
  }): Promise<AdChange> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/budget`, body);
    return response.data;
  },

  // Pausa ou ativa na hora; fica no histórico de mudanças, com desfazer
  setStatus: async ({
    params,
    body,
  }: {
    params: { clientId: string; accountId: string };
    body: { level: Exclude<AdTargetLevel, "account">; metaId: string; status: "ACTIVE" | "PAUSED" };
  }): Promise<AdChange> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/status`, body);
    return response.data;
  },

  approveChange: async ({ params }: { params: { clientId: string; changeId: string } }): Promise<AdChange> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/change/${params.changeId}/approve`);
    return response.data;
  },

  rejectChange: async ({ params }: { params: { clientId: string; changeId: string } }): Promise<AdChange> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/change/${params.changeId}/reject`);
    return response.data;
  },

  revertChange: async ({ params }: { params: { clientId: string; changeId: string } }): Promise<AdChange> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/change/${params.changeId}/revert`);
    return response.data;
  },

  findTraitScoreboard: async (clientId: string, accountId: string, queries: { days: number }): Promise<AdTraitScoreboard> =>
    (await api.get<AdTraitScoreboard>(`/client/${clientId}/meta-ads/account/${accountId}/trait-scoreboard`, { params: queries })).data,

  // Lê os criativos com IA; pode levar até um minuto
  analyzeCreativeDna: async (clientId: string, accountId: string): Promise<AdCreativeDnaCoverage> =>
    (
      await api.post<AdCreativeDnaCoverage>(`/client/${clientId}/meta-ads/account/${accountId}/creative-dna`, undefined, {
        timeout: 180000,
      })
    ).data,

  findAdLearnings: async (clientId: string, accountId: string, queries: { days: number }): Promise<AdLearnings> =>
    (await api.get<AdLearnings>(`/client/${clientId}/meta-ads/account/${accountId}/learnings`, { params: queries })).data,

  findSegmentIntelligence: async (clientId: string): Promise<AdSegmentIntelligence> =>
    (await api.get<AdSegmentIntelligence>(`/client/${clientId}/meta-ads/segment-intelligence`)).data,

  saveIntelligenceSettings: async (clientId: string, body: { optOut: boolean }): Promise<AdSegmentIntelligence> =>
    (await api.put<AdSegmentIntelligence>(`/client/${clientId}/meta-ads/intelligence-settings`, body)).data,

  findAttendanceSettings: async (clientId: string): Promise<AdAttendanceSettings> =>
    (await api.get<AdAttendanceSettings>(`/client/${clientId}/meta-ads/attendance-settings`)).data,

  saveAttendanceSettings: async (clientId: string, body: AdAttendanceSettings): Promise<AdAttendanceSettings> =>
    (await api.put<AdAttendanceSettings>(`/client/${clientId}/meta-ads/attendance-settings`, body)).data,

  findAttendanceQueues: async (clientId: string): Promise<AdAttendanceQueue[]> =>
    (await api.get<AdAttendanceQueue[]>(`/client/${clientId}/meta-ads/attendance-queues`)).data,

  findResponseAnalysis: async (
    clientId: string,
    accountId: string,
    queries: { startDate: string; endDate: string },
  ): Promise<AdResponseAnalysis> =>
    (await api.get<AdResponseAnalysis>(`/client/${clientId}/meta-ads/account/${accountId}/response-time`, { params: queries })).data,

  findHourAnalysis: async (clientId: string, accountId: string, queries: { startDate: string; endDate: string }): Promise<AdHourAnalysis> =>
    (await api.get<AdHourAnalysis>(`/client/${clientId}/meta-ads/account/${accountId}/hours`, { params: queries })).data,

  findGuardrails: async ({ params }: MetaAdsClientParams): Promise<AdGuardrails> => {
    const response = await api.get<AdGuardrails>(`/client/${params.clientId}/meta-ads/guardrails`);
    return response.data;
  },

  saveGuardrails: async ({ params, body }: MetaAdsClientParams & { body: AdGuardrails }): Promise<AdGuardrails> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/guardrails`, body);
    return response.data;
  },

  findRules: async ({ params }: MetaAdsAccountParams): Promise<AdRule[]> => {
    const response = await api.get<AdRule[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/rule`);
    return response.data;
  },

  createRule: async ({ params, body }: MetaAdsAccountParams & { body: AdRuleValues }): Promise<AdRule> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/rule`, body);
    return response.data;
  },

  updateRule: async ({ params, body }: { params: { clientId: string; ruleId: string }; body: AdRuleValues }): Promise<AdRule> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/rule/${params.ruleId}`, body);
    return response.data;
  },

  deleteRule: async ({ params }: { params: { clientId: string; ruleId: string } }): Promise<void> => {
    await api.delete(`/client/${params.clientId}/meta-ads/rule/${params.ruleId}`);
  },

  runRule: async ({ params }: { params: { clientId: string; ruleId: string } }): Promise<{ changes: number }> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/rule/${params.ruleId}/run`);
    return response.data;
  },

  findDrafts: async ({ params }: MetaAdsAccountParams): Promise<AdCampaignDraft[]> => {
    const response = await api.get<AdCampaignDraft[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/draft`);
    return response.data;
  },

  createDraft: async ({
    params,
    body,
  }: MetaAdsAccountParams & { body: Partial<AdDraftRouting> & { name: string; brief: AdCampaignBrief } }): Promise<AdCampaignDraft> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/draft`, body);
    return response.data;
  },

  findDraft: async ({ params }: { params: { clientId: string; draftId: string } }): Promise<AdCampaignDraft> => {
    const response = await api.get<AdCampaignDraft>(`/client/${params.clientId}/meta-ads/draft/${params.draftId}`);
    return response.data;
  },

  updateDraft: async ({
    params,
    body,
  }: {
    params: { clientId: string; draftId: string };
    body: Partial<AdDraftRouting> & { name?: string; brief?: AdCampaignBrief; plan?: AdCampaignPlan };
  }): Promise<AdCampaignDraft> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/draft/${params.draftId}`, body);
    return response.data;
  },

  deleteDraft: async ({ params }: { params: { clientId: string; draftId: string } }): Promise<void> => {
    await api.delete(`/client/${params.clientId}/meta-ads/draft/${params.draftId}`);
  },

  generatePlan: async ({ params }: { params: { clientId: string; draftId: string } }): Promise<AdCampaignDraft> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/draft/${params.draftId}/plan`);
    return response.data;
  },

  publishDraft: async ({ params }: { params: { clientId: string; draftId: string } }): Promise<AdCampaignDraft> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/draft/${params.draftId}/publish`, undefined, { timeout: 180000 });
    return response.data;
  },

  undoDraftPublication: async ({ params }: { params: { clientId: string; draftId: string } }): Promise<AdCampaignDraft> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/draft/${params.draftId}/undo-publication`, undefined, {
      timeout: 120000,
    });
    return response.data;
  },

  activateDraft: async ({ params }: { params: { clientId: string; draftId: string } }): Promise<AdCampaignDraft> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/draft/${params.draftId}/activate`);
    return response.data;
  },

  findAbTest: async ({ params }: { params: { clientId: string; draftId: string } }): Promise<AdAbTestCell[]> => {
    const response = await api.get<AdAbTestCell[]>(`/client/${params.clientId}/meta-ads/draft/${params.draftId}/ab-test`);
    return response.data;
  },

  findAssets: async ({ params }: MetaAdsAccountParams): Promise<AdCreativeAsset[]> => {
    const response = await api.get<AdCreativeAsset[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/asset`);
    return response.data;
  },

  uploadAsset: async ({ params, file }: MetaAdsAccountParams & { file: File }): Promise<AdCreativeAsset> => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/asset`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000,
    });
    return response.data;
  },

  deleteAsset: async ({ params }: { params: { clientId: string; assetId: string } }): Promise<void> => {
    await api.delete(`/client/${params.clientId}/meta-ads/asset/${params.assetId}`);
  },

  findCrmAudiences: async ({ params }: MetaAdsAccountParams): Promise<AdCrmAudience[]> => {
    const response = await api.get<AdCrmAudience[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/crm-audience`);
    return response.data;
  },

  createCrmAudience: async ({
    params,
    body,
  }: MetaAdsAccountParams & {
    body: {
      name: string;
      kind: AdCrmAudienceKind;
      source?: AdCrmAudienceSource;
      pipelineId?: string | null;
      originAudienceId?: string | null;
      ratio?: number | null;
    };
  }): Promise<AdCrmAudience> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/crm-audience`, body, {
      timeout: 180000,
    });
    return response.data;
  },

  syncCrmAudience: async ({ params }: { params: { clientId: string; audienceId: string } }): Promise<AdCrmAudience> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/crm-audience/${params.audienceId}/sync`, undefined, {
      timeout: 180000,
    });
    return response.data;
  },

  deleteCrmAudience: async ({ params }: { params: { clientId: string; audienceId: string } }): Promise<void> => {
    await api.delete(`/client/${params.clientId}/meta-ads/crm-audience/${params.audienceId}`);
  },

  // ---------- Piloto automático ----------

  findBrandProfile: async ({ params }: MetaAdsAccountParams): Promise<AdBrandProfile> => {
    const response = await api.get<AdBrandProfile>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand`);
    return response.data;
  },

  saveBrandSettings: async ({
    params,
    body,
  }: MetaAdsAccountParams & {
    body: { baseText?: string | null; whatsappConfigurationId?: string | null; metaPageId?: string | null };
  }): Promise<AdBrandProfile> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand`, body);
    return response.data;
  },

  saveBrandProfile: async ({ params, profile }: MetaAdsAccountParams & { profile: AdBrandProfileData }): Promise<AdBrandProfile> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand/profile`, { profile });
    return response.data;
  },

  generateBrandProfile: async ({ params }: MetaAdsAccountParams): Promise<AdBrandProfile> => {
    const response = await api.post(
      `/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand/profile/generate`,
      undefined,
      {
        timeout: 180000,
      },
    );
    return response.data;
  },

  addBrandSource: async ({ params, file }: MetaAdsAccountParams & { file: File }): Promise<AdBrandProfile> => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand/source`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180000,
    });
    return response.data;
  },

  deleteBrandSource: async ({ params }: { params: { clientId: string; accountId: string; sourceId: string } }): Promise<AdBrandProfile> => {
    const response = await api.delete(
      `/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand/source/${params.sourceId}`,
    );
    return response.data;
  },

  findBrandLogo: async ({ params }: MetaAdsAccountParams): Promise<{ dataUrl: string | null }> => {
    const response = await api.get(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand/logo`);
    return response.data;
  },

  uploadBrandLogo: async ({ params, file }: MetaAdsAccountParams & { file: File }): Promise<AdBrandProfile> => {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand/logo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  deleteBrandLogo: async ({ params }: MetaAdsAccountParams): Promise<AdBrandProfile> => {
    const response = await api.delete(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand/logo`);
    return response.data;
  },

  refreshBrandIdentity: async ({ params, metaPageId }: MetaAdsAccountParams & { metaPageId?: string | null }): Promise<AdBrandProfile> => {
    const response = await api.post(
      `/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/brand/identity`,
      { metaPageId: metaPageId || null },
      { timeout: 180000 },
    );
    return response.data;
  },

  findScoreboard: async ({ params, days }: MetaAdsAccountParams & { days?: number }): Promise<AdCreativeScore[]> => {
    const response = await api.get<AdCreativeScore[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/scoreboard`, {
      params: { days },
    });
    return response.data;
  },

  analyzeCreatives: async ({ params }: MetaAdsAccountParams): Promise<AdBrandProfile> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/scoreboard/analyze`, undefined, {
      timeout: 180000,
    });
    return response.data;
  },

  findPilotRuns: async ({ params }: MetaAdsAccountParams): Promise<AdPilotRun[]> => {
    const response = await api.get<AdPilotRun[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/run`);
    return response.data;
  },

  requestPilotCampaign: async ({
    params,
    body,
  }: MetaAdsAccountParams & {
    body: {
      maxDailyBudget: number;
      goal?: string | null;
      notes?: string | null;
      whatsappConfigurationId?: string | null;
      metaPageId?: string | null;
    };
  }): Promise<AdPilotRun> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/campaign`, body);
    return response.data;
  },

  requestPilotReview: async ({ params }: MetaAdsAccountParams): Promise<AdPilotRun> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/review`);
    return response.data;
  },

  setPilotDaily: async ({ params, enabled }: MetaAdsAccountParams & { enabled: boolean }): Promise<AdBrandProfile> => {
    const response = await api.put(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/daily`, { enabled });
    return response.data;
  },

  findCreativeRefreshes: async ({
    params,
    status,
  }: MetaAdsAccountParams & { status?: AdCreativeRefreshStatus[] }): Promise<AdCreativeRefresh[]> => {
    const response = await api.get<AdCreativeRefresh[]>(`/client/${params.clientId}/meta-ads/account/${params.accountId}/pilot/refresh`, {
      params: { status: status?.join(",") },
    });
    return response.data;
  },

  approveCreativeRefresh: async ({ params }: { params: { clientId: string; refreshId: string } }): Promise<AdCreativeRefresh> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/pilot/refresh/${params.refreshId}/approve`, undefined, {
      timeout: 120000,
    });
    return response.data;
  },

  rejectCreativeRefresh: async ({ params }: { params: { clientId: string; refreshId: string } }): Promise<AdCreativeRefresh> => {
    const response = await api.post(`/client/${params.clientId}/meta-ads/pilot/refresh/${params.refreshId}/reject`);
    return response.data;
  },
};
