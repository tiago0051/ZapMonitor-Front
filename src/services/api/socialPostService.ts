import api from "./api";

const postBase = (clientId: string) => `/client/${clientId}/social-post`;
const brandBase = (clientId: string) => `/client/${clientId}/brand-identity`;

const upload = (url: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(url, form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const brandIdentityService = {
  find: async (clientId: string): Promise<BrandIdentity> => (await api.get(brandBase(clientId))).data,

  findPages: async (clientId: string): Promise<BrandPage[]> => (await api.get(`${brandBase(clientId)}/page`)).data,

  update: async (
    clientId: string,
    body: { about?: string; fixedHashtags?: string[]; metaPageId?: string; identity?: Partial<BrandIdentityData> },
  ): Promise<BrandIdentity> => (await api.put(brandBase(clientId), body)).data,

  /** Lê a página e o Instagram e refaz a identidade com a IA; pode levar alguns segundos. */
  refresh: async (clientId: string, metaPageId?: string): Promise<BrandIdentity> =>
    (await api.post(`${brandBase(clientId)}/refresh`, { metaPageId }, { timeout: 180000 })).data,

  uploadLogo: async (clientId: string, file: File): Promise<BrandIdentity> => (await upload(`${brandBase(clientId)}/logo`, file)).data,
};

export const socialPostService = {
  findSetup: async (clientId: string): Promise<SocialPostSetup> => (await api.get(`${postBase(clientId)}/setup`)).data,

  findAll: async (
    clientId: string,
    queries: { page?: number; take?: number; status?: string },
  ): Promise<{ total: number; page: number; take: number; items: SocialPost[] }> =>
    (await api.get(postBase(clientId), { params: queries })).data,

  findCalendar: async (clientId: string, from: string, to: string): Promise<SocialPost[]> =>
    (await api.get(`${postBase(clientId)}/calendar`, { params: { from, to } })).data,

  findOne: async (clientId: string, id: string): Promise<SocialPost> => (await api.get(`${postBase(clientId)}/${id}`)).data,

  create: async (
    clientId: string,
    body: {
      idea: string;
      format: SocialPostFormat;
      platforms: SocialPlatform[];
      imageCount?: number;
      plannedFor?: string;
      // A mídia vem do estúdio de criativos: a IA só escreve a legenda
      skipMedia?: boolean;
    },
  ): Promise<SocialPost> => (await api.post(postBase(clientId), body)).data,

  update: async (
    clientId: string,
    id: string,
    body: { caption?: string; hashtags?: string[]; platforms?: SocialPlatform[]; script?: SocialScript },
  ): Promise<SocialPost> => (await api.put(`${postBase(clientId)}/${id}`, body)).data,

  rewrite: async (clientId: string, id: string, instruction?: string): Promise<SocialPost> =>
    (await api.post(`${postBase(clientId)}/${id}/rewrite`, { instruction }, { timeout: 120000 })).data,

  addImage: async (clientId: string, id: string, prompt?: string): Promise<SocialPost> =>
    (await api.post(`${postBase(clientId)}/${id}/media/generate`, { prompt })).data,

  regenerateImage: async (clientId: string, id: string, mediaId: string, prompt?: string): Promise<SocialPost> =>
    (await api.post(`${postBase(clientId)}/${id}/media/${mediaId}/regenerate`, { prompt })).data,

  uploadMedia: async (clientId: string, id: string, file: File): Promise<SocialPost> =>
    (await upload(`${postBase(clientId)}/${id}/media`, file)).data,

  reorderMedia: async (clientId: string, id: string, ids: string[]): Promise<SocialPost> =>
    (await api.put(`${postBase(clientId)}/${id}/media/order`, { ids })).data,

  deleteMedia: async (clientId: string, id: string, mediaId: string): Promise<SocialPost> =>
    (await api.delete(`${postBase(clientId)}/${id}/media/${mediaId}`)).data,

  generateVideo: async (clientId: string, id: string): Promise<SocialPost> => (await api.post(`${postBase(clientId)}/${id}/video`)).data,

  publish: async (clientId: string, id: string): Promise<SocialPost> => (await api.post(`${postBase(clientId)}/${id}/publish`)).data,

  schedule: async (clientId: string, id: string, scheduledAt: string): Promise<SocialPost> =>
    (await api.post(`${postBase(clientId)}/${id}/schedule`, { scheduledAt })).data,

  unschedule: async (clientId: string, id: string): Promise<SocialPost> => (await api.post(`${postBase(clientId)}/${id}/unschedule`)).data,

  remove: async (clientId: string, id: string): Promise<void> => {
    await api.delete(`${postBase(clientId)}/${id}`);
  },
};
