import api from "./api";

export const permissionGroupService = {
  findCatalog: async ({ params }: FindAllPermissionGroupsRequestData): Promise<PermissionDefinition[]> => {
    const response = await api.get<PermissionDefinition[]>(`/client/${params.clientId}/permission-group/catalog`);
    return response.data;
  },

  findAll: async ({ params }: FindAllPermissionGroupsRequestData): Promise<PermissionGroup[]> => {
    const response = await api.get<PermissionGroup[]>(`/client/${params.clientId}/permission-group`);
    return response.data;
  },

  create: async ({ params, body }: CreatePermissionGroupRequestData): Promise<PermissionGroup> => {
    const response = await api.post(`/client/${params.clientId}/permission-group`, body);
    return response.data;
  },

  update: async ({ params, body }: UpdatePermissionGroupRequestData): Promise<PermissionGroup> => {
    const response = await api.put(`/client/${params.clientId}/permission-group/${params.permissionGroupId}`, body);
    return response.data;
  },

  delete: async ({ params }: DeletePermissionGroupRequestData): Promise<void> => {
    await api.delete(`/client/${params.clientId}/permission-group/${params.permissionGroupId}`);
  },
};
