import api from "./api";

export const memberService = {
  findAll: async ({ params, queries }: FindAllMembersRequestData): Promise<PaginatedResponse<Member>> => {
    const response = await api.get(`/client/${params.clientId}/members`, { params: queries });
    return response.data;
  },
  invite: async ({ params, body }: InviteMemberRequestData): Promise<void> => {
    await api.post(`/client/${params.clientId}/invitations`, body);
  },
  cancelInvitation: async ({ params }: CancelInvitationRequestData): Promise<void> => {
    await api.delete(`/client/${params.clientId}/invitations/${params.invitationId}`);
  },
  activate: async ({ params }: ActivateMemberRequestData): Promise<void> => {
    await api.patch(`/client/${params.clientId}/members/${params.userId}/activate`);
  },
  deactivate: async ({ params }: DeactivateMemberRequestData): Promise<void> => {
    await api.patch(`/client/${params.clientId}/members/${params.userId}/deactivate`);
  },
};
