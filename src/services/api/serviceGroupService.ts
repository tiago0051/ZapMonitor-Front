import api from "./api";

export const serviceGroupService = {
  findAll: async ({ params }: FindAllServiceGroupsRequestData): Promise<ServiceGroup[]> => {
    const response = await api.get<ServiceGroup[]>(`/client/${params.clientId}/service-group`);
    return response.data;
  },

  findMine: async ({ params }: FindAllServiceGroupsRequestData): Promise<ServiceGroup[]> => {
    const response = await api.get<ServiceGroup[]>(`/client/${params.clientId}/service-group/mine`);
    return response.data;
  },

  create: async ({ params, body }: CreateServiceGroupRequestData): Promise<ServiceGroup> => {
    const response = await api.post(`/client/${params.clientId}/service-group`, body);
    return response.data;
  },

  update: async ({ params, body }: UpdateServiceGroupRequestData): Promise<ServiceGroup> => {
    const response = await api.put(`/client/${params.clientId}/service-group/${params.serviceGroupId}`, body);
    return response.data;
  },

  delete: async ({ params }: DeleteServiceGroupRequestData): Promise<void> => {
    await api.delete(`/client/${params.clientId}/service-group/${params.serviceGroupId}`);
  },

  findUsage: async (clientId: string, id: string): Promise<ResourceUsage> => {
    const response = await api.get<ResourceUsage>(`/client/${clientId}/service-group/${id}/usage`);
    return response.data;
  },
};
