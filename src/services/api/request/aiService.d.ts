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
