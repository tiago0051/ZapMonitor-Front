import api from "./api";

const baseUrl = (clientId: string) => `/client/${clientId}/whatsapp/quick-replies`;

export const quickReplyService = {
  findAll: async ({ params }: FindAllQuickRepliesRequestData): Promise<QuickReply[]> => {
    const response = await api.get(baseUrl(params.clientId));
    return response.data;
  },
  create: async ({ params, body }: CreateQuickReplyRequestData): Promise<QuickReply> => {
    const response = await api.post(baseUrl(params.clientId), body);
    return response.data;
  },
  update: async ({ params, body }: UpdateQuickReplyRequestData): Promise<QuickReply> => {
    const response = await api.put(`${baseUrl(params.clientId)}/${params.id}`, body);
    return response.data;
  },
  delete: async ({ params }: DeleteQuickReplyRequestData): Promise<void> => {
    await api.delete(`${baseUrl(params.clientId)}/${params.id}`);
  },
};
