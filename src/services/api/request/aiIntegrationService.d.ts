type AiIntegrationClientRequestParams = {
  clientId: string;
};

type AiIntegrationProviderRequestParams = {
  clientId: string;
  provider: AiIntegrationProviderKey;
};

type AiIntegrationToolRequestParams = {
  clientId: string;
  provider: AiIntegrationProviderKey;
  toolName: string;
};

type FindAllAiIntegrationProvidersRequestData = {
  params: AiIntegrationClientRequestParams;
};

type FindAllAiIntegrationsRequestData = {
  params: AiIntegrationClientRequestParams;
};

type UpsertAiIntegrationRequestData = {
  params: AiIntegrationProviderRequestParams;
  body: UpsertAiIntegrationRequestBody;
};

type UpsertAiIntegrationRequestBody = {
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  enabledTools?: string[];
};

type ToggleAiIntegrationRequestData = {
  params: AiIntegrationProviderRequestParams;
  enabled: boolean;
};

type ToggleAiIntegrationToolRequestData = {
  params: AiIntegrationToolRequestParams;
  enabled: boolean;
};

type TestAiIntegrationRequestData = {
  params: AiIntegrationProviderRequestParams;
};

type DeleteAiIntegrationRequestData = {
  params: AiIntegrationProviderRequestParams;
};
