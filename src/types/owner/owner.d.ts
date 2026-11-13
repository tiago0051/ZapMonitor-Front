type OwnerUserSummary = {
  id: string;
  name: string;
  email: string;
};

type OwnerImplanter = OwnerUserSummary & {
  totalClients: number;
  newClients: number;
  activeUsers: number;
  messages: number;
  services: number;
};

type OwnerImplanters = {
  implanters: OwnerImplanter[];
  clientsWithoutImplanter: number;
};

type OwnerClient = {
  id: string;
  name: string;
  createdAt: string;
  implanter: OwnerUserSummary | null;
  activeUsers: number;
  messages: number;
  services: number;
  // Vencimento do plano
  plan?: PlanStatus;
  // Segmento da inteligência de anúncios (definido pela equipe do ZapMonitor)
  adSegment: string | null;
  // O cliente pediu para não participar da inteligência compartilhada
  adIntelligenceOptOut: boolean;
  // Exclusão pedida pelo dono; preenchido enquanto os dados são apagados
  deletingAt: string | null;
};

type OwnerAdSegment = { value: string; label: string };
