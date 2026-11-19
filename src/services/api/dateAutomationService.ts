import api from "./api";

const base = (clientId: string) => `/client/${clientId}/date-automation`;

export const dateAutomationService = {
  findAll: async (clientId: string): Promise<DateAutomation[]> => (await api.get(base(clientId))).data,

  create: async (clientId: string, body: DateAutomationInput): Promise<DateAutomation> => (await api.post(base(clientId), body)).data,

  update: async (clientId: string, id: string, body: DateAutomationInput): Promise<DateAutomation> =>
    (await api.put(`${base(clientId)}/${id}`, body)).data,

  setActive: async (clientId: string, id: string, active: boolean): Promise<DateAutomation> =>
    (await api.post(`${base(clientId)}/${id}/active`, { active })).data,

  remove: async (clientId: string, id: string): Promise<void> => {
    await api.delete(`${base(clientId)}/${id}`);
  },
};
