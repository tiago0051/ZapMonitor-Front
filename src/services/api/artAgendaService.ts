import api from "./api";

const base = (clientId: string) => `/client/${clientId}/art-agenda`;

export const artAgendaService = {
  /** Pauta da semana (esta ou a próxima): cota usada, temas e as artes. */
  findWeek: async (clientId: string, week: "current" | "next"): Promise<ArtAgendaWeek> =>
    (await api.get(base(clientId), { params: { week } })).data,

  /** A IA escolhe os temas e cria as artes que faltam na cota da semana. */
  requestAgenda: async (clientId: string, week: "current" | "next"): Promise<ArtAgendaWeek> =>
    (await api.post(base(clientId), { week })).data,

  findSettings: async (clientId: string): Promise<ArtAgendaSettings> => (await api.get(`${base(clientId)}/settings`)).data,

  saveSettings: async (clientId: string, body: ArtAgendaSettings): Promise<ArtAgendaSettings> =>
    (await api.put(`${base(clientId)}/settings`, body)).data,

  /** Aprovar agenda a publicação no dia e na hora previstos. */
  approve: async (clientId: string, postId: string): Promise<SocialPost> =>
    (await api.post(`${base(clientId)}/post/${postId}/approve`)).data,

  revise: async (clientId: string, postId: string, body: { instruction: string; target: ArtRevisionTarget }): Promise<SocialPost> =>
    (await api.post(`${base(clientId)}/post/${postId}/revise`, body)).data,

  savePillars: async (clientId: string, pillars: ContentPillar[]): Promise<ContentPillar[]> =>
    (await api.put(`${base(clientId)}/pillars`, { pillars })).data,

  /** Pilares sugeridos pela IA; nada é salvo. */
  suggestPillars: async (clientId: string): Promise<ContentPillar[]> => (await api.post(`${base(clientId)}/pillars/suggest`)).data,

  findLinks: async (clientId: string, socialPostId?: string): Promise<OrganicLink[]> =>
    (await api.get(`${base(clientId)}/link`, { params: socialPostId ? { socialPostId } : {} })).data,

  createLink: async (
    clientId: string,
    body: { socialPostId?: string | null; name: string; whatsappConfigurationId: string; message: string },
  ): Promise<OrganicLink> => (await api.post(`${base(clientId)}/link`, body)).data,

  updateLink: async (clientId: string, id: string, body: { name?: string; message?: string; active?: boolean }): Promise<OrganicLink> =>
    (await api.put(`${base(clientId)}/link/${id}`, body)).data,
};
