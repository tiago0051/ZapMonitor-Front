import api from "./api";

export const ownerService = {
  findImplanters: async ({ queries }: FindOwnerImplantersRequestData): Promise<OwnerImplanters> => {
    const response = await api.get("/owner/implanters", { params: queries });
    return response.data;
  },
  findClients: async ({ queries }: FindOwnerClientsRequestData): Promise<PaginatedResponse<OwnerClient>> => {
    const response = await api.get("/owner/clients", { params: queries });
    return response.data;
  },
  searchUsers: async ({ queries }: SearchOwnerUsersRequestData): Promise<OwnerUserSummary[]> => {
    const response = await api.get("/owner/users", { params: queries });
    return response.data;
  },
  changeClientImplanter: async ({ params, body }: ChangeClientImplanterRequestData): Promise<void> => {
    await api.put(`/owner/clients/${params.clientId}/implanter`, body);
  },
  findAdSegments: async (): Promise<OwnerAdSegment[]> => {
    const response = await api.get<OwnerAdSegment[]>("/owner/ad-segments");
    return response.data;
  },
  changeClientAdSegment: async ({ params, body }: ChangeClientAdSegmentRequestData): Promise<void> => {
    await api.put(`/owner/clients/${params.clientId}/ad-segment`, body);
  },
  deleteClient: async ({ params, body }: DeleteOwnerClientRequestData): Promise<void> => {
    await api.delete(`/owner/clients/${params.clientId}`, { data: body });
  },
};
