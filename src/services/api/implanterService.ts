import api from "./api";

export const implanterService = {
  findClients: async (): Promise<ImplanterClient[]> => {
    const response = await api.get("/implanter/clients");
    return response.data;
  },
  findUsers: async ({ queries }: FindAllImplanterUsersRequestData): Promise<PaginatedResponse<ImplanterUser>> => {
    const response = await api.get("/implanter/users", { params: queries });
    return response.data;
  },
  updateUser: async ({ params, body }: UpdateImplanterUserRequestData): Promise<void> => {
    await api.put(`/implanter/users/${params.userId}`, body);
  },
  sendPasswordReset: async ({ params }: SendImplanterUserPasswordResetRequestData): Promise<void> => {
    await api.post(`/implanter/users/${params.userId}/password-reset`);
  },
};
