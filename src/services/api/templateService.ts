import api from "./api";

export const templateService = {
  findAll: async ({params}: FindClientByIdRequestData): Promise<Template[]> => {
    const response = await api.get<Template[]>(`/client/${params.clientId}/template`);
    return response.data;
  },
};
