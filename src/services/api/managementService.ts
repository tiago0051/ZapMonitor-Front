import api from "./api";

export const managementService = {
  findInProgress: async ({ params }: FindManagementInProgressRequestData): Promise<ManagementAttendantInProgress[]> => {
    const response = await api.get(`/client/${params.clientId}/management/in-progress`);
    return response.data;
  },

  findAttendedSummary: async ({ params, queries }: FindManagementAttendedSummaryRequestData): Promise<ManagementAttendantSummary[]> => {
    const response = await api.get(`/client/${params.clientId}/management/attended`, { params: queries });
    return response.data;
  },

  findAttendedServices: async ({
    params,
    queries,
  }: FindManagementAttendedServicesRequestData): Promise<PaginatedResponse<ManagementAttendedService>> => {
    const response = await api.get(`/client/${params.clientId}/management/attended/${params.userId}`, { params: queries });
    return response.data;
  },
};
