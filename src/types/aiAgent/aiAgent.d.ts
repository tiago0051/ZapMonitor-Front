type AiAgent = {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  model: string | null;
  temperature: number;
  createdAt: string;
  updatedAt: string;
};
