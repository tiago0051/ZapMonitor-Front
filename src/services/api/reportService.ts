import api from "./api";

export const reportService = {
  findWhatsappPerformance: async ({ params, queries }: FindWhatsappPerformanceRequestData): Promise<WhatsappPerformance> => {
    const response = await api.get<WhatsappPerformance>(`/client/${params.clientId}/report/whatsapp-performance`, { params: queries });
    return response.data;
  },
};
