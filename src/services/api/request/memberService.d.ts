type FindAllMembersRequestData = {
  params: FindAllMembersRequestParams;
  queries: FindAllMembersRequestQuery;
};

type FindAllMembersRequestParams = {
  clientId: string;
};

type FindAllMembersRequestQuery = PaginateRequestQuery & {
  search?: string;
  status?: MemberStatus;
};

type InviteMemberRequestData = {
  params: InviteMemberRequestParams;
  body: InviteMemberRequestBody;
};

type InviteMemberRequestParams = {
  clientId: string;
};

type MemberRoleRequestBody = {
  role: TenantRole;
  permissionGroupId: string | null;
};

type InviteMemberRequestBody = MemberRoleRequestBody & {
  email: string;
  // Grupos de atendimento em que a pessoa entra ao aceitar
  serviceGroupIds?: string[];
};

type InvitationRequestParams = {
  clientId: string;
  invitationId: string;
};

type InvitationLink = {
  url: string;
  expiresAt: string;
};

type ChangeMemberRoleRequestData = {
  params: ChangeMemberRoleRequestParams;
  body: MemberRoleRequestBody;
};

type ChangeMemberRoleRequestParams = {
  clientId: string;
  userId: string;
};

type CancelInvitationRequestData = {
  params: CancelInvitationRequestParams;
};

type CancelInvitationRequestParams = {
  clientId: string;
  invitationId: string;
};

type ActivateMemberRequestData = {
  params: ActivateMemberRequestParams;
};

type ActivateMemberRequestParams = {
  clientId: string;
  userId: string;
};

type DeactivateMemberRequestData = {
  params: DeactivateMemberRequestParams;
  // Quem assume: grupos em que ele é o único ativo exigem substituto
  body?: {
    serviceGroupReplacements?: Record<string, string>;
    transferToUserId?: string | null;
  };
};

// Onde o usuário está no cliente antes de ser desativado
type MemberDeactivationImpact = {
  serviceGroups: { id: string; name: string; otherActiveMembers: number; onlyMember: boolean }[];
  contactsInService: number;
  openDeals: number;
  openDealTasks: number;
  openPlannerTasks: number;
  assistantRoutines: number;
};

type DeactivateMemberRequestParams = {
  clientId: string;
  userId: string;
};
