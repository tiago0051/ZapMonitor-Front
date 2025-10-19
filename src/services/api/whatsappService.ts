import api from "./api";

export const whatsappService = {
  findAllConfigurations: async ({
    params,
    queries,
  }: FindAllWhatsappConfigurationRequestData): Promise<PaginatedResponse<WhatsappConfiguration>> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/configuration`, { params: queries });
    return response.data;
  },
  createConfiguration: async ({ body, params }: CreateWhatsappConfigurationRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/configuration`, body);
    return response.data;
  },
  findAllMessageCategoriesByClient: async ({
    params,
    queries,
  }: FindAllWhatsappMessageCategoryRequestData): Promise<PaginatedResponse<WhatsappMessageCategory>> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/category`, { params: queries });
    return response.data;
  },
  createMessageCategory: async ({ body, params }: CreateWhatsappMessageCategoryRequestData): Promise<WhatsappMessageCategory> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/category`, body);
    return response.data;
  },
  findAllContactMessagesInServiceByUser: async (): Promise<WhatsappContactMessage[]> => {
    const response = await api.get(`/user/whatsapp/message/in-service`);
    return response.data;
  },
  findAllContactMessagesAwaitServiceByUser: async (): Promise<WhatsappContactMessage[]> => {
    const response = await api.get(`/user/whatsapp/message/await-service`);
    return response.data;
  },
  findAllContactMessagesByUser: async ({
    queries,
  }: FindAllWhatsappContactMessagesRequestData): Promise<PaginatedResponse<WhatsappContactMessage>> => {
    const response = await api.get(`/user/whatsapp/message`, {
      params: queries,
    });

    return response.data;
  },
  findCountUnreadMessages: async (): Promise<number> => {
    const response = await api.get(`/user/whatsapp/message/unread/count`);
    return response.data;
  },
  findAllWhatsappMessagesByContact: async ({
    queries,
    params,
  }: FindAllWhatsappMessagesByContactRequestData): Promise<PaginatedResponse<WhatsappMessage>> => {
    const response = await api.get(`/user/whatsapp/contact/${params.contactMessageId}/message`, {
      params: queries,
    });
    return response.data;
  },
  getFileDocumentUploadUrl: async ({
    body,
    params,
  }: GetFileDocumentUploadUrlRequestData): Promise<GetFileDocumentUploadUrlResponseData> => {
    const response = await api.post(
      `/user/whatsapp/contact/${params.contactId}/configuration/${params.configurationId}/message/document/upload-url`,
      body,
    );
    return response.data;
  },
  createWhatsappMessage: async ({ body, params }: CreateWhatsappMessageRequestData): Promise<WhatsappMessage> => {
    const response = await api.post(`/user/whatsapp/contact/${params.contactId}/configuration/${params.configurationId}/message`, body);
    return response.data;
  },
  findAllMessageCategoriesByUser: async ({
    queries,
  }: FindAllMessageCategoriesByUserData): Promise<PaginatedResponse<WhatsappMessageCategory>> => {
    const response = await api.get(`/user/whatsapp/category`, {
      params: queries,
    });
    return response.data;
  },
  updateLinkCategoryToContact: async ({ params, body }: CreateLinkCategoryToContactRequestData): Promise<void> => {
    const response = await api.put(`/user/whatsapp/category/link/contact/${params.contactId}`, body);
    return response.data;
  },
  findContactServiceByContact: async ({ params }: FindWhatsappContactServiceByContactRequestData): Promise<WhatsappContactService> => {
    const response = await api.get(`/user/whatsapp/contact/${params.contactId}/service`);
    return response.data;
  },
  findAllServicesHistoryByContact: async ({
    params,
    queries,
  }: FindAllWhatsappServicesHistoryByContactRequestData): Promise<PaginatedResponse<WhatsappServiceHistory>> => {
    const response = await api.get(`/user/whatsapp/contact/${params.contactId}/service/history`, {
      params: queries,
    });
    return response.data;
  },
  startService: async ({ params }: StartWhatsappServiceRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/user/whatsapp/contact/${params.contactId}/service/start`);
    return response.data;
  },
  transferService: async ({ params }: TransferWhatsappServiceRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/user/whatsapp/contact/${params.contactId}/service/transfer/${params.userId}`);
    return response.data;
  },
  endService: async ({ params }: EndWhatsappServiceRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/user/whatsapp/contact/${params.contactId}/service/end`);
    return response.data;
  },
};
