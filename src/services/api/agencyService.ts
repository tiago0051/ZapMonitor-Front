import api from "./api";

const base = (clientId: string) => `/client/${clientId}/agency`;

export const agencyService = {
  /** Objetivos com o andamento da meta e o último relatório de cada frente. */
  findOverview: async (clientId: string): Promise<AgencyOverview> => (await api.get(base(clientId))).data,

  createObjective: async (clientId: string, body: SaveObjectiveBody): Promise<BusinessObjective> =>
    (await api.post(`${base(clientId)}/objective`, body)).data,

  updateObjective: async (clientId: string, id: string, body: SaveObjectiveBody): Promise<BusinessObjective> =>
    (await api.put(`${base(clientId)}/objective/${id}`, body)).data,

  setObjectiveStatus: async (clientId: string, id: string, status: ObjectiveStatus): Promise<BusinessObjective> =>
    (await api.put(`${base(clientId)}/objective/${id}/status`, { status })).data,

  findReportHistory: async (clientId: string, front: AgencyFront): Promise<FrontReport[]> =>
    (await api.get(`${base(clientId)}/report`, { params: { front } })).data,

  /** Gera agora os relatórios dos últimos 7 dias fechados; sem frentes, todas as do plano. */
  requestReports: async (clientId: string, fronts?: AgencyFront[]): Promise<FrontReport[]> =>
    (await api.post(`${base(clientId)}/report`, { fronts })).data,
};
