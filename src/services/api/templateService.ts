import api from "./api";

export const templateService = {
  create: async ({ body, params }: CreateWhatsappTemplateRequestData): Promise<WhatsappTemplate> => {
    const response = await api.post(`/client/${params.clientId}/template`, body);
    return response.data;
  },

  findAll: async ({ params }: FindClientByIdRequestData): Promise<WhatsappTemplate[]> => {
    const response = await api.get<WhatsappTemplate[]>(`/client/${params.clientId}/template`);
    return response.data;
  },

  delete: async ({ params }: DeleteWhatsappTemplateRequestData): Promise<void> => {
    const response = await api.delete(`/client/${params.clientId}/template/template/${params.templateId}`);
    return response.data;
  },
};
