import api from "./api";

export const notificatioService = {
  findAllEmails: async ({ query }: FindAllEmailsRequestData) => {
    const response = await api.get<PaginatedResponse<EmailMessage>>(
      `/notification/email`,
      {
        params: query,
      }
    );

    return response.data;
  },
};
