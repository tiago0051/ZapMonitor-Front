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
  systemPrompt: string;
  model: string;
  temperature: number;
};

type UpdateAiConfigRequestData = {
  params: UpdateAiConfigRequestParams;
  body: UpdateAiConfigRequestBody;
};

type UpdateAiConfigRequestParams = {
  clientId: string;
};

type UpdateAiConfigRequestBody = {
  apiKey?: string;
  systemPrompt: string;
};
