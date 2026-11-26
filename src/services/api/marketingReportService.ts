import axios from "axios";
import api from "./api";

const base = (clientId: string) => `/client/${clientId}/marketing-report`;

// A página pública não tem login: chamada sem cookies e sem os interceptadores de sessão
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const marketingReportService = {
  findAll: async (clientId: string): Promise<MarketingReport[]> => (await api.get(base(clientId))).data,

  create: async (clientId: string, body: { month: string; includeOrganic?: boolean }): Promise<MarketingReport> =>
    (await api.post(base(clientId), body, { timeout: 180000 })).data,

  revoke: async (clientId: string, id: string): Promise<void> => {
    await api.delete(`${base(clientId)}/${id}`);
  },

  findPublic: async (token: string): Promise<MarketingReportData & { expiresAt: string }> =>
    (await publicApi.get(`/public/marketing-report/${encodeURIComponent(token)}`)).data,
};

/** PDF do relatório pelo link público: baixa direto da API. */
export const marketingReportPdfUrl = (token: string) =>
  `${import.meta.env.VITE_API_URL}/public/marketing-report/${encodeURIComponent(token)}/pdf`;

/** Endereço público do relatório (rota fora do painel). */
export const marketingReportUrl = (token: string) => `${window.location.origin}/relatorio/${token}`;
