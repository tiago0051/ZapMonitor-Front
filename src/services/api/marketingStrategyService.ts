import api from "./api";

const base = (clientId: string) => `/client/${clientId}/marketing-strategy`;

export const marketingStrategyService = {
  findPlaybooks: async (clientId: string): Promise<MarketingPlaybook[]> => (await api.get(`${base(clientId)}/playbook`)).data,

  findAll: async (clientId: string): Promise<MarketingStrategySummary[]> => (await api.get(base(clientId))).data,

  find: async (clientId: string, id: string): Promise<MarketingStrategy> => (await api.get(`${base(clientId)}/${id}`)).data,

  /** A IA monta a estratégia na fila; acompanhe pelo status. */
  create: async (
    clientId: string,
    body: { brief: MarketingBrief; playbookSlug?: string | null; offerId?: string | null },
  ): Promise<MarketingStrategy> => (await api.post(base(clientId), body)).data,

  regenerate: async (
    clientId: string,
    id: string,
    body: { brief?: MarketingBrief; playbookSlug?: string | null; offerId?: string | null },
  ): Promise<MarketingStrategy> => (await api.post(`${base(clientId)}/${id}/regenerate`, body)).data,

  update: async (clientId: string, id: string, body: { name?: string; archived?: boolean }): Promise<MarketingStrategy> =>
    (await api.put(`${base(clientId)}/${id}`, body)).data,

  delete: async (clientId: string, id: string) => (await api.delete(`${base(clientId)}/${id}`)).data,

  setStepStatus: async (clientId: string, id: string, stepId: string, status: MarketingStepStatus): Promise<MarketingStrategy> =>
    (await api.put(`${base(clientId)}/${id}/step/${stepId}/status`, { status })).data,

  /** Tarefa no Planejamento ou rascunho de postagem do passo, já ligado à estratégia. */
  executeStep: async (
    clientId: string,
    id: string,
    stepId: string,
    as: "PLANNER_TASK" | "SOCIAL_POST",
  ): Promise<{ kind: MarketingLinkKind; objectId: string; strategy: MarketingStrategy }> =>
    (await api.post(`${base(clientId)}/${id}/step/${stepId}/execute`, { as })).data,

  /** O próximo item deste tipo criado no módulo (em até 2 horas) nasce ligado ao passo. */
  createIntent: async (clientId: string, id: string, stepId: string, kind: MarketingIntentKind) =>
    (await api.post(`${base(clientId)}/${id}/step/${stepId}/intent`, { kind })).data,

  // Atalho de passo ainda valendo para o usuário nestes tipos (vazio quando não há)
  findActiveIntent: async (clientId: string, kinds: MarketingIntentKind[]): Promise<MarketingActiveIntent | null> => {
    const data = (await api.get(`${base(clientId)}/intent`, { params: { kinds: kinds.join(",") } })).data;
    return data?.stepTitle ? data : null;
  },

  cancelIntents: async (clientId: string, kinds: MarketingIntentKind[]): Promise<void> => {
    await api.delete(`${base(clientId)}/intent`, { params: { kinds: kinds.join(",") } });
  },

  findLinkableCampaigns: async (clientId: string): Promise<LinkableCampaign[]> => (await api.get(`${base(clientId)}/campaign`)).data,

  linkCampaign: async (clientId: string, id: string, body: { campaignId: string; stepId?: string | null }): Promise<MarketingStrategy> =>
    (await api.post(`${base(clientId)}/${id}/link`, body)).data,

  unlink: async (clientId: string, id: string, linkId: string): Promise<MarketingStrategy> =>
    (await api.delete(`${base(clientId)}/${id}/link/${linkId}`)).data,

  findResults: async (clientId: string, id: string, refresh = false): Promise<StrategyResultsResponse> =>
    (await api.get(`${base(clientId)}/${id}/results`, { params: refresh ? { refresh: true } : {} })).data,

  validateAd: async (
    clientId: string,
    id: string,
    body: { kind: "AD_DRAFT" | "AD_VIDEO_CAMPAIGN"; objectId: string },
  ): Promise<MarketingAdValidation> => (await api.post(`${base(clientId)}/${id}/validate`, body)).data,

  findLatestReview: async (clientId: string, id: string): Promise<MarketingStrategyReview | null> =>
    (await api.get(`${base(clientId)}/${id}/review`)).data || null,

  requestReview: async (clientId: string, id: string): Promise<MarketingStrategyReview> =>
    (await api.post(`${base(clientId)}/${id}/review`)).data,

  decideRecommendation: async (
    clientId: string,
    id: string,
    reviewId: string,
    recommendationId: string,
    decision: "ACCEPT" | "DISMISS",
  ): Promise<MarketingStrategyReview> =>
    (await api.post(`${base(clientId)}/${id}/review/${reviewId}/recommendation/${recommendationId}`, { decision })).data,
};

/** Biblioteca de playbooks do dono do sistema. */
export const ownerPlaybookService = {
  findAll: async (): Promise<MarketingPlaybook[]> => (await api.get("/owner/marketing-playbook")).data,
  create: async (playbook: MarketingPlaybookData): Promise<MarketingPlaybook> =>
    (await api.post("/owner/marketing-playbook", { playbook })).data,
  update: async (slug: string, playbook: MarketingPlaybookData): Promise<MarketingPlaybook> =>
    (await api.put(`/owner/marketing-playbook/${slug}`, { playbook })).data,
  setEnabled: async (slug: string, enabled: boolean): Promise<MarketingPlaybook> =>
    (await api.put(`/owner/marketing-playbook/${slug}/enabled`, { enabled })).data,
  resetOrDelete: async (slug: string) => (await api.delete(`/owner/marketing-playbook/${slug}`)).data,
};
