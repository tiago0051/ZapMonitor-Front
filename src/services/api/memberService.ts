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
  /** Manda o e-mail de novo e o convite volta a valer por 7 dias. */
  resendInvitation: async ({ params }: { params: InvitationRequestParams }): Promise<void> => {
    await api.post(`/client/${params.clientId}/invitations/${params.invitationId}/resend`);
  },
  findInvitationLink: async ({ params }: { params: InvitationRequestParams }): Promise<InvitationLink> =>
    (await api.get(`/client/${params.clientId}/invitations/${params.invitationId}/link`)).data,
  changeRole: async ({ params, body }: ChangeMemberRoleRequestData): Promise<void> => {
    await api.put(`/client/${params.clientId}/members/${params.userId}/role`, body);
  },
  activate: async ({ params }: ActivateMemberRequestData): Promise<void> => {
    await api.patch(`/client/${params.clientId}/members/${params.userId}/activate`);
  },
  deactivate: async ({ params, body }: DeactivateMemberRequestData): Promise<void> => {
    await api.patch(`/client/${params.clientId}/members/${params.userId}/deactivate`, body ?? {});
  },
  /** Grupos, atendimentos, negócios, tarefas e rotinas do usuário, e os grupos em que ele é o único ativo. */
  findDeactivationImpact: async (clientId: string, userId: string): Promise<MemberDeactivationImpact> =>
    (await api.get(`/client/${clientId}/members/${userId}/deactivation-impact`)).data,
  /** Histórico de alterações do tenant (fluxos, agentes, grupos, números, equipe e acessos). */
  findAuditLogs: async (
    clientId: string,
    queries: { page: number; take: number; entityType?: AuditEntityType[]; from?: string; to?: string },
  ): Promise<PaginatedResponse<AuditLog>> =>
    (
      await api.get(`/client/${clientId}/audit-logs`, {
        params: { ...queries, entityType: queries.entityType?.length ? queries.entityType.join(",") : undefined },
      })
    ).data,
  findSecurity: async (clientId: string): Promise<{ requireTwoFactor: boolean }> => (await api.get(`/client/${clientId}/security`)).data,
  updateSecurity: async (clientId: string, body: { requireTwoFactor: boolean }): Promise<{ requireTwoFactor: boolean }> =>
    (await api.put(`/client/${clientId}/security`, body)).data,
};
