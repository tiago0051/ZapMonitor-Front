import api from "./api";

export const reportService = {
  findMonthlyReport: async (clientId: string, year: number, month: number): Promise<MonthlyReport> => {
    const response = await api.get<MonthlyReport>(`/client/${clientId}/report/monthly`, {
      params: { year, month },
    });
    return response.data;
  },

  findDailyMessages: async (clientId: string, year: number, month: number): Promise<DailyMessage[]> => {
    const response = await api.get<DailyMessagesResponse>(`/client/${clientId}/report/daily-messages`, {
      params: { year, month },
    });
    return response.data.data;
  },
};
