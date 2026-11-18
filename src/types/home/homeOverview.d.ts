// Cada número só vem quando o usuário tem permissão de ver aquele assunto
type HomeMetrics = {
  queueWaiting?: number;
  inService?: number;
  myConversations?: number;
  servicesToday?: number;
  newContactsLast7Days?: number;
  openDeals?: { count: number; value: number };
  activeBroadcasts?: number;
};

type HomeOnboarding = {
  hasNumber: boolean;
  // Algum grupo com ao menos uma pessoa
  hasServiceGroup: boolean;
  // Todo número ativo tem um fluxo de atendimento ativo
  hasActiveFlow: boolean;
  numbersWithoutActiveFlow: number;
  hasAiAgent: boolean;
  // O plano inclui IA
  aiAvailable: boolean;
  // Algum fluxo foi testado no simulador ou por número de teste
  hasTestedFlow: boolean;
  hasTeam: boolean;
  hasTemplate: boolean;
  hasContacts: boolean;
  hasPipeline: boolean;
  // O usuário logado já assumiu algum atendimento
  hasAttendedService: boolean;
  // O usuário logado ativou notificações neste cliente
  hasPushNotifications: boolean;
};

// Marketing em 4 passos; nulo quando o plano não tem anúncios
type HomeMarketing = {
  hasBrandIdentity: boolean;
  hasAdAccount: boolean;
  hasSaleEvent: boolean;
  hasStrategy: boolean;
};

type HomeOverview = {
  metrics: HomeMetrics;
  onboarding: HomeOnboarding;
  marketing: HomeMarketing | null;
};
