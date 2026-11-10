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
  updateConfigurationToken: async ({ params, body }: UpdateWhatsappConfigurationTokenRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.put(`/client/${params.clientId}/whatsapp/configuration/${params.configurationId}/token`, body);
    return response.data;
  },
  findConfigurationWebhook: async ({ params }: FindWhatsappConfigurationWebhookRequestData): Promise<WhatsappConfigurationWebhook> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/configuration/${params.configurationId}/webhook`);
    return response.data;
  },
  findNumberUsage: async ({ params }: FindWhatsappNumberUsageRequestData): Promise<WhatsappNumberUsage> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/configuration/usage`);
    return response.data;
  },
  createEmbeddedSignup: async ({ body, params }: CreateWhatsappEmbeddedSignupRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/configuration/embedded-signup`, body);
    return response.data;
  },
  createWhatsappWebConfiguration: async ({ params }: CreateWhatsappWebConfigurationRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/configuration/whatsapp-web`, {});
    return response.data;
  },
  findWhatsappWebStatus: async ({ params }: WhatsappWebConfigurationRequestData): Promise<WhatsappWebStatus> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/configuration/${params.configurationId}/whatsapp-web`);
    return response.data;
  },
  reconnectWhatsappWeb: async ({ params }: WhatsappWebConfigurationRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/configuration/${params.configurationId}/whatsapp-web/reconnect`);
    return response.data;
  },
  disconnectWhatsappWeb: async ({ params }: WhatsappWebConfigurationRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/configuration/${params.configurationId}/whatsapp-web/disconnect`);
    return response.data;
  },
  // Exclusão lógica; o número por QR code também é desconectado do celular
  deleteConfiguration: async ({ params }: DeleteWhatsappConfigurationRequestData): Promise<void> => {
    await api.delete(`/client/${params.clientId}/whatsapp/configuration/${params.configurationId}`);
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
  findAllContactMessagesInServiceByUser: async ({
    params,
    queries,
  }: FindAllContactMessagesInServiceByUserRequestData): Promise<WhatsappContactMessage[]> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/message/in-service`, {
      params: queries,
    });
    return response.data;
  },
  findAllContactMessagesAwaitServiceByUser: async ({
    params,
    queries,
  }: FindAllContactMessagesAwaitServiceByUserRequestData): Promise<WhatsappContactMessage[]> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/message/await-service`, {
      params: queries,
    });
    return response.data;
  },
  findAllContacts: async ({
    queries,
    params,
  }: FindAllWhatsappContactMessagesRequestData): Promise<PaginatedResponse<WhatsappContactMessage>> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/contact`, {
      params: queries,
    });

    return response.data;
  },
  findContactsStats: async ({
    params,
    queries,
  }: FindAllWhatsappContactMessagesStatsRequestData): Promise<{
    queueCount: number;
    myCount: number;
  }> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/contact/stats`, { params: queries });

    return response.data;
  },
  findCountUnreadMessages: async ({ params }: FindCountUnreadMessagesRequestData): Promise<number> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/message/unread/count`);
    return response.data;
  },
  findAllWhatsappMessagesByContact: async ({
    queries,
    params,
  }: FindAllWhatsappMessagesByContactRequestData): Promise<PaginatedResponse<WhatsappMessage>> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/contact/${params.contactMessageId}/message`, {
      params: queries,
    });
    return response.data;
  },
  getFileDocumentUploadUrl: async ({
    body,
    params,
  }: GetFileDocumentUploadUrlRequestData): Promise<GetFileDocumentUploadUrlResponseData> => {
    const response = await api.post(
      `/client/${params.clientId}/whatsapp/contact/${params.contactId}/configuration/${params.configurationId}/message/document/${params.fileType}/upload-url`,
      body,
    );
    return response.data;
  },
  getTemplateHeaderUploadUrl: async ({
    body,
    params,
  }: GetTemplateHeaderUploadUrlRequestData): Promise<GetFileDocumentUploadUrlResponseData> => {
    const response = await api.post(
      `/client/${params.clientId}/whatsapp/configuration/${params.configurationId}/template-header/${params.fileType}/upload-url`,
      body,
    );
    return response.data;
  },
  // Pede à IA a leitura de uma imagem ou PDF recebido; a leitura chega pelo socket, como as transcrições
  describeMessageMedia: async ({ params }: DescribeWhatsappMessageMediaRequestData): Promise<{ queued: boolean }> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/contact/${params.contactId}/message/${params.messageId}/describe`);
    return response.data;
  },
  createWhatsappMessage: async ({ body, params }: CreateWhatsappMessageRequestData): Promise<WhatsappMessage> => {
    const response = await api.post(
      `/client/${params.clientId}/whatsapp/contact/${params.contactId}/configuration/${params.configurationId}/message`,
      body,
    );
    return response.data;
  },
  findAllMessageCategoriesByUser: async ({
    queries,
    params,
  }: FindAllMessageCategoriesByUserData): Promise<PaginatedResponse<WhatsappMessageCategory>> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/category`, {
      params: queries,
    });
    return response.data;
  },
  updateLinkCategoryToContact: async ({ params, body }: CreateLinkCategoryToContactRequestData): Promise<void> => {
    const response = await api.put(`/client/${params.clientId}/whatsapp/category/link/contact/${params.contactId}`, body);
    return response.data;
  },
  findContactServiceByContact: async ({ params }: FindWhatsappContactServiceByContactRequestData): Promise<WhatsappContactService> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/contact/${params.contactId}/service`);
    return response.data;
  },
  findAllServicesHistoryByContact: async ({
    params,
    queries,
  }: FindAllWhatsappServicesHistoryByContactRequestData): Promise<PaginatedResponse<WhatsappServiceHistory>> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/contact/${params.contactId}/service/history`, {
      params: queries,
    });
    return response.data;
  },
  startService: async ({ params }: StartWhatsappServiceRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/contact/${params.contactId}/service/start`);
    return response.data;
  },
  transferService: async ({ params }: TransferWhatsappServiceRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/contact/${params.contactId}/service/transfer/${params.userId}`);
    return response.data;
  },
  forwardService: async ({ params }: ForwardWhatsappServiceRequestData): Promise<void> => {
    await api.post(
      `/client/${params.clientId}/whatsapp/contact/${params.contactId}/service/flow/forward/${encodeURIComponent(params.outputId)}`,
    );
  },
  endService: async ({ params }: EndWhatsappServiceRequestData): Promise<WhatsappConfiguration> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/contact/${params.contactId}/service/end`);
    return response.data;
  },
  updateContact: async ({ params, body }: UpdateContactRequestData) => {
    const response = await api.put(`/client/${params.clientId}/whatsapp/contact/${params.contactId}`, body);
    return response.data;
  },
  sendTemplate: async ({ params, body }: SendTemplateRequestData) => {
    const response = await api.post(
      `/client/${params.clientId}/whatsapp/contact/${params.contactId}/configuration/${params.configurationId}/template`,
      body,
    );
    return response.data;
  },
  sendTemplateToNewContact: async ({ params, body }: SendTemplateToNewContactRequestData): Promise<WhatsappContactMessage> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/contact/template`, body);
    return response.data;
  },
  findAllFilesByContact: async ({
    params,
    queries,
  }: FindAllWhatsappFilesByContactRequestData): Promise<PaginatedResponse<WhatsappMessage>> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/contact/${params.contactId}/file`, {
      params: queries,
    });
    return response.data;
  },
};
