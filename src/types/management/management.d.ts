type ManagementContact = {
  id: string;
  name: string | null;
  surname: string | null;
  phoneNumber: string;
};

type ManagementAttendant = {
  userId: string;
  name: string;
  email: string;
  // Falso quando o acesso do colaborador ao cliente foi desativado
  active: boolean;
};

type ManagementInProgressService = {
  serviceId: string;
  contact: ManagementContact;
  assignedAt: string | null;
  lastMessageAt: string | null;
};

type ManagementAttendantInProgress = ManagementAttendant & {
  services: ManagementInProgressService[];
};

type ManagementAttendantSummary = ManagementAttendant & {
  total: number;
};

type ManagementAttendedService = {
  serviceId: string;
  // 2 = aguardando, 3 = em atendimento, 4 = finalizado (1 = automação)
  status: number;
  contact: ManagementContact;
  startedAt: string;
  assignedAt: string;
  finishedAt: string | null;
};
