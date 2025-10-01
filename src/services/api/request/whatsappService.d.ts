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
};

type FindAllContactMessagesInServiceByUserRequestParams = {
  clientId: string;
};
//#endregion

//#region findAllContactMessagesAwaitServiceByUser
type FindAllContactMessagesAwaitServiceByUserRequestData = {
  params: FindAllContactMessagesAwaitServiceByUserRequestParams;
};

type FindAllContactMessagesAwaitServiceByUserRequestParams = {
  clientId: string;
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

//#region findAllContactMessagesByUser
type FindAllWhatsappContactMessagesRequestData = {
  queries: FindAllWhatsappContactMessagesRequestQuery;
  params: FindAllWhatsappContactMessagesRequestParams;
};

type FindAllWhatsappContactMessagesRequestParams = {
  clientId: string;
};

type FindAllWhatsappContactMessagesRequestQuery = PaginateRequestQuery & {
  categoryIds: string[];
  text: string;
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
