import api from "./api";

const base = (clientId: string) => `/client/${clientId}/segment`;

export const segmentService = {
  findAll: async (clientId: string): Promise<ContactSegment[]> => (await api.get(base(clientId))).data,

  create: async (clientId: string, body: { name: string; rules: SegmentRules }): Promise<ContactSegment> =>
    (await api.post(base(clientId), body)).data,

  update: async (clientId: string, id: string, body: { name: string; rules: SegmentRules }): Promise<ContactSegment> =>
    (await api.put(`${base(clientId)}/${id}`, body)).data,

  remove: async (clientId: string, id: string): Promise<void> => {
    await api.delete(`${base(clientId)}/${id}`);
  },

  preview: async (clientId: string, body: { rules: SegmentRules }): Promise<SegmentPreview> =>
    (await api.post(`${base(clientId)}/preview`, body)).data,
};
