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
};

type DeactivateMemberRequestParams = {
  clientId: string;
  userId: string;
};
