import api from "./api";

const base = (clientId: string) => `/client/${clientId}/creative-studio`;

export const creativeStudioService = {
  findAll: async (
    clientId: string,
    queries: { page?: number; take?: number; kind?: CreativeKind; purpose?: CreativePurpose },
  ): Promise<{ total: number; page: number; take: number; items: CreativeProjectSummary[] }> =>
    (await api.get(base(clientId), { params: queries })).data,

  findOne: async (clientId: string, id: string): Promise<CreativeProject> => (await api.get(`${base(clientId)}/${id}`)).data,

  create: async (
    clientId: string,
    body: {
      title?: string;
      kind: CreativeKind;
      purpose: CreativePurpose;
      brief?: string;
      aspectRatio?: CreativeAspectRatio;
      durationSeconds?: number;
      useBrand?: boolean;
    },
  ): Promise<CreativeProject> => (await api.post(base(clientId), body)).data,

  update: async (
    clientId: string,
    id: string,
    body: { title?: string; brief?: string; aspectRatio?: CreativeAspectRatio; durationSeconds?: number; useBrand?: boolean },
  ): Promise<CreativeProject> => (await api.put(`${base(clientId)}/${id}`, body)).data,

  delete: async (clientId: string, id: string): Promise<void> => {
    await api.delete(`${base(clientId)}/${id}`);
  },

  addBaseImage: async (clientId: string, id: string, file: File): Promise<CreativeProject> => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post(`${base(clientId)}/${id}/base-image`, form, { headers: { "Content-Type": "multipart/form-data" } })).data;
  },

  removeBaseImage: async (clientId: string, id: string, imageId: string): Promise<CreativeProject> =>
    (await api.delete(`${base(clientId)}/${id}/base-image/${imageId}`)).data,

  generate: async (clientId: string, id: string, variations?: number): Promise<CreativeProject> =>
    (await api.post(`${base(clientId)}/${id}/generate`, { variations })).data,

  requestChange: async (clientId: string, id: string, generationId: string, instruction: string): Promise<CreativeProject> =>
    (await api.post(`${base(clientId)}/${id}/generation/${generationId}/change`, { instruction })).data,

  retry: async (clientId: string, id: string, generationId: string): Promise<CreativeProject> =>
    (await api.post(`${base(clientId)}/${id}/generation/${generationId}/retry`)).data,

  setFavorite: async (clientId: string, id: string, generationId: string, favorite: boolean): Promise<CreativeProject> =>
    (await api.put(`${base(clientId)}/${id}/generation/${generationId}/favorite`, { favorite })).data,

  deleteGeneration: async (clientId: string, id: string, generationId: string): Promise<CreativeProject> =>
    (await api.delete(`${base(clientId)}/${id}/generation/${generationId}`)).data,

  /** Envia para a biblioteca de criativos da conta da Meta; vídeo pode levar alguns segundos. */
  sendToAds: async (clientId: string, generationId: string, adAccountId: string): Promise<AdCreativeAsset> =>
    (await api.post(`${base(clientId)}/generation/${generationId}/ads`, { adAccountId }, { timeout: 180000 })).data,

  attachToPost: async (clientId: string, generationId: string, postId: string): Promise<SocialPost> =>
    (await api.post(`${base(clientId)}/generation/${generationId}/post`, { postId }, { timeout: 120000 })).data,

  createPost: async (
    clientId: string,
    body: { generationIds: string[]; platforms: SocialPlatform[]; idea?: string },
  ): Promise<{ id: string }> => (await api.post(`${base(clientId)}/post`, body, { timeout: 180000 })).data,
};
