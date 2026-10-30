type FindAllAiAgentsRequestData = {
  params: FindAllAiAgentsRequestParams;
};

type FindAllAiAgentsRequestParams = {
  clientId: string;
};

type SaveAiAgentRequestBody = {
  name: string;
  description?: string;
  systemPrompt: string;
  temperature?: number;
};

type CreateAiAgentRequestData = {
  params: CreateAiAgentRequestParams;
  body: SaveAiAgentRequestBody;
};

type CreateAiAgentRequestParams = {
  clientId: string;
};

type UpdateAiAgentRequestData = {
  params: UpdateAiAgentRequestParams;
  body: SaveAiAgentRequestBody;
};

type UpdateAiAgentRequestParams = {
  clientId: string;
  aiAgentId: string;
};

type DeleteAiAgentRequestData = {
  params: DeleteAiAgentRequestParams;
};

type DeleteAiAgentRequestParams = {
  clientId: string;
  aiAgentId: string;
};

type GenerateSystemPromptRequestData = {
  params: GenerateSystemPromptRequestParams;
  body: GenerateSystemPromptRequestBody;
};

type GenerateSystemPromptRequestParams = {
  clientId: string;
};

type GenerateSystemPromptRequestBody = {
  objective: string;
  currentPrompt?: string;
  refinement?: string;
};
