
type CreateWhatsappTemplateRequestData = {
  params: CreateWhatsappTemplateRequestParams;
  body: CreateWhatsappTemplateRequestBody;
};

type CreateWhatsappTemplateRequestBody = {
  name: string;
  description?: string;
};

type CreateWhatsappTemplateRequestParams = {
  clientId: string;
};

type FindClientByIdRequestParams = {
  clientId: string;
};

type FindClientByIdRequestData = {
  params: FindClientByIdRequestParams;
};

