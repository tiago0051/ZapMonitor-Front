type FindZenviaToolRequestData = {
  params: AiAgentToolRequestParams;
};

type SaveZenviaToolRequestData = {
  params: AiAgentToolRequestParams;
  // apiKey vazio mantém a chave já salva
  body: { enabled: boolean; baseUrl: string; apiKey?: string; eventId?: string | null };
};
