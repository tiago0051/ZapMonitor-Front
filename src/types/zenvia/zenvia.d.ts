// Venda de ingressos pelo Zenvia como ferramenta do agente de IA
type ZenviaTool = {
  enabled: boolean;
  baseUrl: string;
  // Já existe uma chave salva (a chave nunca volta para a tela)
  hasApiKey: boolean;
  eventId: string | null;
};
