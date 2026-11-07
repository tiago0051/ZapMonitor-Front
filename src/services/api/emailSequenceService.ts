import api from "./api";

const base = (clientId: string) => `/client/${clientId}/email-sequence`;

export const emailSequenceService = {
  findAll: async (clientId: string): Promise<EmailSequence[]> => (await api.get(base(clientId))).data,

  findOne: async (clientId: string, id: string): Promise<EmailSequence> => (await api.get(`${base(clientId)}/${id}`)).data,

  create: async (clientId: string, body: EmailSequenceInput): Promise<EmailSequence> => (await api.post(base(clientId), body)).data,

  update: async (clientId: string, id: string, body: EmailSequenceInput): Promise<EmailSequence> =>
    (await api.put(`${base(clientId)}/${id}`, body)).data,

  setActive: async (clientId: string, id: string, active: boolean): Promise<EmailSequence> =>
    (await api.post(`${base(clientId)}/${id}/${active ? "activate" : "deactivate"}`)).data,

  remove: async (clientId: string, id: string): Promise<void> => {
    await api.delete(`${base(clientId)}/${id}`);
  },

  findEnrollments: async (
    clientId: string,
    queries: { sequenceId?: string; contactId?: string; status?: string; page?: number; take?: number },
  ): Promise<EmailCampaignPage<EmailEnrollment>> => (await api.get(`${base(clientId)}/enrollment`, { params: queries })).data,

  enroll: async (clientId: string, id: string, body: { contactId: string; dealId?: string | null }): Promise<EmailEnrollment> =>
    (await api.post(`${base(clientId)}/${id}/enroll`, body)).data,

  stopEnrollment: async (clientId: string, enrollmentId: string): Promise<EmailEnrollment> =>
    (await api.post(`${base(clientId)}/enrollment/${enrollmentId}/stop`)).data,
};
