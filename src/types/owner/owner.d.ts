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
};
