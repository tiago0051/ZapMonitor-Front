import api from "./api";

const base = (clientId: string) => `/client/${clientId}/sales-coach`;

export const salesCoachService = {
  /** A IA diz em que pé a conversa está e sugere a próxima mensagem (a pessoa revisa e envia). */
  tip: async (clientId: string, whatsappContactId: string): Promise<SalesTip> =>
    (await api.post(`${base(clientId)}/tip`, { whatsappContactId })).data,

  alerts: async (clientId: string, whatsappContactId: string): Promise<SalesAlert[]> =>
    (await api.get(`${base(clientId)}/contact/${whatsappContactId}/alerts`)).data,

  coachings: async (clientId: string, whatsappContactId: string): Promise<ServiceCoaching[]> =>
    (await api.get(`${base(clientId)}/contact/${whatsappContactId}/coaching`)).data,

  team: async (clientId: string, days: number): Promise<TeamCoachingReport> =>
    (await api.get(`${base(clientId)}/team`, { params: { days } })).data,
};
