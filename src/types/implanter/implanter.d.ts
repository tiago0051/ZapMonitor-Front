type ImplanterClient = {
  id: string;
  name: string;
  activeMembers: number;
  createdAt: string;
  // É o implantador representante (responsável pela venda) e pode renovar o plano
  isRepresentative: boolean;
  plan: PlanStatus;
};

type ImplanterUserMembership = {
  clientId: string;
  clientName: string;
  role: TenantRole;
  permissionGroupId: string | null;
  permissionGroupName: string | null;
  active: boolean;
};

type ImplanterUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  // Apenas os vínculos com tenants do implantador
  memberships: ImplanterUserMembership[];
  // Falso quando o usuário também está em tenants que o implantador não implanta
  canEditProfile: boolean;
};
