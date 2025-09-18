type FindAllWhatsappConfigurationRequestData = {
  params: FindAllWhatsappConfigurationRequesParams;
  queries: PaginateRequestQuery;
};

type FindAllWhatsappConfigurationRequesParams = {
  clientId: string;
};

type CreateWhatsappConfigurationRequestData = {
  params: CreateWhatsappConfigurationRequesParams;
  body: CreateWhatsappConfigurationRequestBody;
};

type CreateWhatsappConfigurationRequestBody = {
  phoneNumber: string;
  phoneNumberId: string;
  authorizationToken: string;
  webhookSecret: string;
};

type CreateWhatsappConfigurationRequesParams = {
  clientId: string;
};

type CreateWhatsappMessageCategoryRequestData = {
  params: CreateWhatsappMessageCategoryRequestParams;
  body: CreateWhatsappMessageCategoryRequestBody;
};

type CreateWhatsappMessageCategoryRequestBody = {
  name: string;
};

type CreateWhatsappMessageCategoryRequestParams = {
  clientId: string;
};

type FindAllWhatsappMessageCategoryRequestData = {
  params: FindAllWhatsappMessageCategoryRequestParams;
  queries: FindAllWhatsappMessageCategoryRequestQuery;
};

type FindAllWhatsappMessageCategoryRequestQuery = PaginateRequestQuery & {
  text: string;
};

type FindAllWhatsappMessageCategoryRequestParams = {
  clientId: string;
};

type FindAllWhatsappContactMessagesRequestData = {
  queries: FindAllWhatsappContactMessagesRequestQuery;
};

type FindAllWhatsappContactMessagesRequestQuery = PaginateRequestQuery & {
  categoryIds: string[];
  text: string;
};

type FindAllWhatsappMessagesByContactRequestData = {
  params: FindAllWhatsappMessagesByContactRequestParams;
  queries: PaginateRequestQuery;
};

type FindAllWhatsappMessagesByContactRequestParams = {
  contactMessageId: string;
};

type CreateWhatsappMessageRequestData = {
  params: CreateWhatsappMessageRequestParams;
  body: CreateWhatsappMessageRequestBody;
};

type CreateWhatsappMessageRequestParams = {
  contactId: string;
  configurationId: string;
};

type CreateWhatsappMessageRequestBody = {
  message: string;
};

type CreateLinkCategoryToContactRequestData = {
  params: CreateLinkCategoryToContactRequestParams;
  body: string[];
};

type CreateLinkCategoryToContactRequestParams = {
  contactId: string;
};

type FindAllMessageCategoriesByUserData = {
  queries: FindAllMessageCategoriesByUserQuery;
};

type FindAllMessageCategoriesByUserQuery = PaginateRequestQuery & {
  text: string;
};

type FindWhatsappContactServiceByContactRequestData = {
  params: FindWhatsappContactServiceByContactRequestParams;
};

type FindWhatsappContactServiceByContactRequestParams = {
  contactId: string;
};

type FindAllWhatsappServicesHistoryByContactRequestData = {
  queries: PaginateRequestQuery;
  params: FindAllWhatsappServicesHistoryByContactRequestParams;
};

type FindAllWhatsappServicesHistoryByContactRequestParams = {
  contactId: string;
};

type StartWhatsappServiceRequestData = {
  params: StartWhatsappServiceRequestParams;
};

type StartWhatsappServiceRequestParams = {
  contactId: string;
};

type TransferWhatsappServiceRequestData = {
  params: TransferWhatsappServiceRequestParams;
};

type TransferWhatsappServiceRequestParams = {
  contactId: string;
  userId: string;
};

type EndWhatsappServiceRequestData = {
  params: EndWhatsappServiceRequestParams;
};

type EndWhatsappServiceRequestParams = {
  contactId: string;
};
