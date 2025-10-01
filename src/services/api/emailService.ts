import api from "./api";

export const emailService = {
  findAllEmails: async ({ query, params }: FindAllEmailsRequestData) => {
    const response = await api.get<PaginatedResponse<EmailMessage>>(`/client/${params.clientId}/email`, {
      params: query,
    });

    return response.data;
  },
};
