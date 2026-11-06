import api from "./api";

export const templateService = {
  create: async ({ body, params }: CreateWhatsappTemplateRequestData): Promise<WhatsappTemplate> => {
    const response = await api.post(`/client/${params.clientId}/template`, body);
    return response.data;
  },

  /** Com configurationId, só os modelos que o número pode enviar (da WABA dele e os manuais). */
  findAll: async ({ params, queries }: FindAllWhatsappTemplatesRequestData): Promise<WhatsappTemplate[]> => {
    const response = await api.get<WhatsappTemplate[]>(`/client/${params.clientId}/template`, { params: queries });
    return response.data;
  },

  sync: async ({ params }: FindClientByIdRequestData): Promise<WhatsappTemplateSyncResult> => {
    const response = await api.post<WhatsappTemplateSyncResult>(`/client/${params.clientId}/template/sync`);
    return response.data;
  },

  delete: async ({ params }: DeleteWhatsappTemplateRequestData): Promise<void> => {
    const response = await api.delete(`/client/${params.clientId}/template/template/${params.templateId}`);
    return response.data;
  },
};
