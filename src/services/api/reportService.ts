import api from "./api";

export const reportService = {
  findMonthlyReport: async ({ params, queries }: FindMonthlyReportRequestData): Promise<MonthlyReport> => {
    const response = await api.get<MonthlyReport>(`/client/${params.clientId}/report/monthly`, {
      params: queries,
    });
    return response.data;
  },

  findDailyMessages: async ({ params, queries }: FindDailyMessagesRequestData): Promise<DailyMessage[]> => {
    const response = await api.get<DailyMessagesResponse>(`/client/${params.clientId}/report/daily-messages`, {
      params: queries,
    });
    return response.data.data;
  },
};
