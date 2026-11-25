import axios from "axios";
import api from "./api";

const base = (clientId: string) => `/client/${clientId}/proposal`;

// Link público da proposta: sem login, sem cookies e sem os interceptadores de sessão
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL });
const publicBase = (token: string) => `/public/proposal/${encodeURIComponent(token)}`;

export const proposalService = {
  findAll: async (clientId: string, query: { status?: ProposalStatus; days?: number } = {}): Promise<Proposal[]> =>
    (await api.get(base(clientId), { params: query })).data,

  stats: async (clientId: string, days = 90): Promise<ProposalStats> =>
    (await api.get(`${base(clientId)}/stats`, { params: { days } })).data,

  findTemplates: async (clientId: string): Promise<ProposalTemplate[]> => (await api.get(`${base(clientId)}/template`)).data,

  saveTemplate: async (clientId: string, body: Omit<ProposalTemplate, "id">, id?: string): Promise<ProposalTemplate> =>
    (id ? await api.put(`${base(clientId)}/template/${id}`, body) : await api.post(`${base(clientId)}/template`, body)).data,

  archiveTemplate: async (clientId: string, id: string) => (await api.delete(`${base(clientId)}/template/${id}`)).data,

  findByDeal: async (clientId: string, dealId: string): Promise<Proposal[]> => (await api.get(`${base(clientId)}/deal/${dealId}`)).data,

  /** Nova proposta com os itens do negócio; com withAi, a IA já redige o texto. */
  create: async (clientId: string, dealId: string, body: { templateId?: string | null; withAi?: boolean }): Promise<Proposal> =>
    (await api.post(`${base(clientId)}/deal/${dealId}`, body)).data,

  find: async (clientId: string, id: string): Promise<Proposal> => (await api.get(`${base(clientId)}/${id}`)).data,

  update: async (clientId: string, id: string, body: ProposalUpdateBody): Promise<Proposal> =>
    (await api.put(`${base(clientId)}/${id}`, body)).data,

  writeWithAi: async (clientId: string, id: string): Promise<Proposal> => (await api.post(`${base(clientId)}/${id}/ai`)).data,

  decideDiscount: async (clientId: string, id: string, approve: boolean): Promise<Proposal> =>
    (await api.post(`${base(clientId)}/${id}/discount`, { approve })).data,

  requestPdf: async (clientId: string, id: string): Promise<Proposal> => (await api.post(`${base(clientId)}/${id}/pdf`)).data,

  pdfUrl: async (clientId: string, id: string): Promise<{ url: string }> => (await api.get(`${base(clientId)}/${id}/pdf`)).data,

  preview: async (clientId: string, id: string): Promise<ProposalView> => (await api.get(`${base(clientId)}/${id}/preview`)).data,

  /** Copiar o link conta como envio: o rastreio de abertura começa. */
  shareLink: async (clientId: string, id: string): Promise<{ url: string; proposal: Proposal }> =>
    (await api.post(`${base(clientId)}/${id}/link`)).data,

  sendWhatsapp: async (clientId: string, id: string, caption?: string): Promise<Proposal> =>
    (await api.post(`${base(clientId)}/${id}/send/whatsapp`, { caption })).data,

  sendEmail: async (clientId: string, id: string, to?: string): Promise<Proposal> =>
    (await api.post(`${base(clientId)}/${id}/send/email`, { to })).data,

  findPublic: async (token: string): Promise<ProposalView> => (await publicApi.get(publicBase(token))).data,

  publicPdfUrl: async (token: string): Promise<{ url: string }> => (await publicApi.get(`${publicBase(token)}/pdf`)).data,

  acceptPublic: async (token: string, name: string): Promise<{ result: PublicProposalAcceptResult }> =>
    (await publicApi.post(`${publicBase(token)}/accept`, { name })).data,

  declinePublic: async (token: string, reason?: string): Promise<{ declined: boolean }> =>
    (await publicApi.post(`${publicBase(token)}/decline`, { reason })).data,
};
