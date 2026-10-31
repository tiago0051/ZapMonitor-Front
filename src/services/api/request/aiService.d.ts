type GetClientAiConfigRequestData = {
  params: GetClientAiConfigRequestParams;
};

type GetClientAiConfigRequestParams = {
  clientId: string;
};

type CreateAiConfigRequestData = {
  params: CreateAiConfigRequestParams;
  body: CreateAiConfigRequestBody;
};

type CreateAiConfigRequestParams = {
  clientId: string;
};

type CreateAiConfigRequestBody = {
  apiKey: string;
};

type UpdateAiConfigRequestData = {
  params: UpdateAiConfigRequestParams;
  body: UpdateAiConfigRequestBody;
};

type UpdateAiConfigRequestParams = {
  clientId: string;
};

type UpdateAiConfigRequestBody = {
  apiKey: string;
};

type ToggleAiConfigRequestData = {
  params: GetClientAiConfigRequestParams;
  enabled: boolean;
};
