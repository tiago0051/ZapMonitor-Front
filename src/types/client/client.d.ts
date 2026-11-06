type Client = {
  id: string;
  name: string;
  hasAiConfig: boolean;
  // O plano venceu: os usuários (menos implantadores) estão sem acesso
  planExpired?: boolean;
  createdAt: string;
  updatedAt: string;
};
