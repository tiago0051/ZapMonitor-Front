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

//#region findAllContactMessagesInServiceByUser
type FindAllContactMessagesInServiceByUserRequestData = {
  params: FindAllContactMessagesInServiceByUserRequestParams;
  queries: FindAllContactMessagesInServiceByUserRequestQuery;
};

type FindAllContactMessagesInServiceByUserRequestParams = {
  clientId: string;
};

type FindAllContactMessagesInServiceByUserRequestQuery = {
  categoryIds: string[];
  text: string;
};
//#endregion

//#region findAllContactMessagesAwaitServiceByUser
type FindAllContactMessagesAwaitServiceByUserRequestData = {
  params: FindAllContactMessagesAwaitServiceByUserRequestParams;
  queries: FindAllContactMessagesAwaitServiceByUserRequestQuery;
};

type FindAllContactMessagesAwaitServiceByUserRequestParams = {
  clientId: string;
};

type FindAllContactMessagesAwaitServiceByUserRequestQuery = {
  categoryIds: string[];
  text: string;
};
//#endregion

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

//#region findAllContacts
type FindAllWhatsappContactMessagesRequestData = {
  queries: FindAllWhatsappContactMessagesRequestQuery;
  params: FindAllWhatsappContactMessagesRequestParams;
};

type FindAllWhatsappContactMessagesRequestParams = {
  clientId: string;
};

type FindAllWhatsappContactMessagesRequestQuery = PaginateRequestQuery & {
  text: string;
  tab: "queue" | "mine" | "all";
};
//#endregion

//#region findAllContactsStats
type FindAllWhatsappContactMessagesStatsRequestData = {
  params: FindAllWhatsappContactMessagesStatsRequestParams;
};

type FindAllWhatsappContactMessagesStatsRequestParams = {
  clientId: string;
};
//#endregion

//#region findCountUnreadMessages
type FindCountUnreadMessagesRequestData = {
  params: FindCountUnreadMessagesRequestParams;
};

type FindCountUnreadMessagesRequestParams = {
  clientId: string;
};
//#endregion

//#region findAllWhatsappMessagesByContact
type FindAllWhatsappMessagesByContactRequestData = {
  params: FindAllWhatsappMessagesByContactRequestParams;
  queries: PaginateRequestQuery;
};

type FindAllWhatsappMessagesByContactRequestParams = {
  contactMessageId: string;
  clientId: string;
};
//#endregion

//#region getFileDocumentUploadUrl
type GetFileDocumentUploadUrlRequestData = {
  params: GetFileDocumentUploadUrlRequestParams;
  body: GetFileDocumentUploadUrlRequestBody;
};

type GetFileDocumentUploadUrlRequestParams = {
  contactId: string;
  configurationId: string;
  clientId: string;
  fileType: string;
};

type GetFileDocumentUploadUrlRequestBody = {
  mimeType: string;
  fileSize: number;
  fileName: string;
};
//#endregion

//#region createWhatsappMessage
type CreateWhatsappMessageRequestData = {
  params: CreateWhatsappMessageRequestParams;
  body: CreateWhatsappMessageRequestBody;
};

type CreateWhatsappMessageRequestParams = {
  contactId: string;
  configurationId: string;
  clientId: string;
};

type CreateWhatsappMessageRequestBody = {
  type: string;
  text?: string;
  fileId?: string;
};
//#endregion

//#region updateLinkCategoryToContact
type CreateLinkCategoryToContactRequestData = {
  params: CreateLinkCategoryToContactRequestParams;
  body: string[];
};

type CreateLinkCategoryToContactRequestParams = {
  contactId: string;
  clientId: string;
};
//#endregion

//#region findAllMessageCategoriesByUser
type FindAllMessageCategoriesByUserData = {
  queries: FindAllMessageCategoriesByUserQuery;
  params: FindAllMessageCategoriesByUserParams;
};

type FindAllMessageCategoriesByUserParams = {
  clientId: string;
};

type FindAllMessageCategoriesByUserQuery = PaginateRequestQuery & {
  text: string;
};
//#endregion

//#region findContactServiceByContact
type FindWhatsappContactServiceByContactRequestData = {
  params: FindWhatsappContactServiceByContactRequestParams;
};

type FindWhatsappContactServiceByContactRequestParams = {
  contactId: string;
  clientId: string;
};
//#endregion

//#region findAllServicesHistoryByContact
type FindAllWhatsappServicesHistoryByContactRequestData = {
  queries: PaginateRequestQuery;
  params: FindAllWhatsappServicesHistoryByContactRequestParams;
};

type FindAllWhatsappServicesHistoryByContactRequestParams = {
  contactId: string;
  clientId: string;
};
//#endregion

//#region startService
type StartWhatsappServiceRequestData = {
  params: StartWhatsappServiceRequestParams;
};

type StartWhatsappServiceRequestParams = {
  contactId: string;
  clientId: string;
};
//#endregion

//#region transferService
type TransferWhatsappServiceRequestData = {
  params: TransferWhatsappServiceRequestParams;
};

type TransferWhatsappServiceRequestParams = {
  contactId: string;
  userId: string;
  clientId: string;
};
//#endregion

//#region endService
type EndWhatsappServiceRequestData = {
  params: EndWhatsappServiceRequestParams;
};

type EndWhatsappServiceRequestParams = {
  contactId: string;
  clientId: string;
};
//#endregion

//#region Update Contact
type UpdateContactRequestData = {
  params: UpdateContactRequestParams;
  body: UpdateContactRequestBody;
};

type UpdateContactRequestParams = {
  contactId: string;
  clientId: string;
};

type UpdateContactRequestBody = {
  surname: string;
};
//#endregion

//#region Send Template
type SendTemplateRequestData = {
  params: SendTemplateRequestParams;
  body: SendTemplateRequestBody;
};

type SendTemplateRequestParams = {
  clientId: string;
  contactId: string;
  configurationId: string;
};

type SendTemplateRequestBody = {
  templateId: string;
};

//#endregion

//#region findAllFilesByContact
type FindAllWhatsappFilesByContactRequestData = {
  params: FindAllWhatsappFilesByContactRequestParams;
  queries: PaginateRequestQuery;
};

type FindAllWhatsappFilesByContactRequestParams = {
  contactId: string;
  clientId: string;
};
//#endregion
