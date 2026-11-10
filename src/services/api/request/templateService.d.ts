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

type CreateMetaWhatsappTemplateRequestData = {
  params: CreateWhatsappTemplateRequestParams;
  body: {
    configurationId: string;
    draft: WhatsappTemplateDraft;
    headerFileId?: string;
    description?: string;
  };
};

type AssistWhatsappTemplateRequestData = {
  params: CreateWhatsappTemplateRequestParams;
  body: {
    mode: "generate" | "review";
    objective?: string;
    refinement?: string;
    draft?: WhatsappTemplateDraft;
    language: string;
  };
};
