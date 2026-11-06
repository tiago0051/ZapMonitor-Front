type CreateWhatsappTemplateRequestData = {
  params: CreateWhatsappTemplateRequestParams;
  body: CreateWhatsappTemplateRequestBody;
};

type CreateWhatsappTemplateRequestBody = {
  name: string;
  language: string;
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

type FindAllWhatsappTemplatesRequestData = {
  params: FindClientByIdRequestParams;
  queries?: { configurationId?: string };
};

type DeleteWhatsappTemplateRequestData = {
  params: DeleteWhatsappTemplateRequestParams;
};

type DeleteWhatsappTemplateRequestParams = {
  clientId: string;
  templateId: string;
};
