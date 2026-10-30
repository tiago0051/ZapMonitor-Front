type AiIntegrationProviderKey = "GOOGLE_CALENDAR";

type AiIntegrationJsonSchema = {
  type?: string;
  required?: string[];
  properties?: Record<string, { type?: string; description?: string; default?: unknown; minimum?: number; maximum?: number }>;
  [key: string]: unknown;
};

type AiIntegrationProvider = {
  key: AiIntegrationProviderKey;
  name: string;
  description: string;
  tools: { name: string; description: string }[];
  credentialsSchema: AiIntegrationJsonSchema;
  settingsSchema: AiIntegrationJsonSchema;
};

type AiIntegrationTool = {
  name: string;
  description: string;
  enabled: boolean;
};

type AiIntegration = {
  id: string;
  provider: AiIntegrationProviderKey;
  enabled: boolean;
  hasCredentials: boolean;
  settings: Record<string, unknown> | null;
  tools: AiIntegrationTool[];
  createdAt: string;
  updatedAt: string;
};
