type AiAgent = {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  temperature: number;
  createdAt: string;
  updatedAt: string;
};

type AiAgentTestMessage = { role: "contact" | "bot"; text: string };

type AiAgentTestResult = {
  reply: string;
  toolCalls: { name: string; label: string; detail: string | null }[];
  simulatedActions: string[];
  finished: boolean;
};
