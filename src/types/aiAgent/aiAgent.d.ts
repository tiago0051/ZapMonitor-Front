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
  // A resposta usou trechos do que o agente sabe
  usedKnowledge: boolean;
};

type AiAgentKnowledgeKind = "QA" | "FILE" | "URL";

type AiAgentKnowledgeSource = {
  id: string;
  kind: AiAgentKnowledgeKind;
  title: string;
  question: string | null;
  answer: string | null;
  sourceUrl: string | null;
  fileName: string | null;
  charCount: number;
  createdAt: string;
};

type AiAgentKnowledge = {
  sources: AiAgentKnowledgeSource[];
  usage: { sources: number; chars: number; maxSources: number; maxChars: number };
};
