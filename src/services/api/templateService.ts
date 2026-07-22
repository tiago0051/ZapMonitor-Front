import api from "./api";

export const templateService = {
  findAll: async ({params}: FindClientByIdRequestData): Promise<WhatsappTemplate[]> => {
    const response = await api.get<WhatsappTemplate[]>(`/client/${params.clientId}/template`);
    return response.data;
  },
};
