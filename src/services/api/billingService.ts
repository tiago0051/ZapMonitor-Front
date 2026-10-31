import api from "./api";

export const billingService = {
  findPriceTables: async (): Promise<PriceTable[]> => {
    const response = await api.get("/owner/price-tables");
    return response.data;
  },
  createPriceTable: async ({ body }: CreatePriceTableRequestData): Promise<PriceTable> => {
    const response = await api.post("/owner/price-tables", body);
    return response.data;
  },
  updatePriceTable: async ({ params, body }: UpdatePriceTableRequestData): Promise<PriceTable> => {
    const response = await api.put(`/owner/price-tables/${params.priceTableId}`, body);
    return response.data;
  },
  deletePriceTable: async ({ params }: DeletePriceTableRequestData): Promise<void> => {
    await api.delete(`/owner/price-tables/${params.priceTableId}`);
  },
  findClientPlan: async ({ params }: FindClientPlanRequestData): Promise<ClientPlan> => {
    const response = await api.get(`/owner/clients/${params.clientId}/plan`);
    return response.data;
  },
  saveClientPlan: async ({ params, body }: SaveClientPlanRequestData): Promise<ClientPlan> => {
    const response = await api.put(`/owner/clients/${params.clientId}/plan`, body);
    return response.data;
  },
  endClientPlan: async ({ params }: EndClientPlanRequestData): Promise<void> => {
    await api.delete(`/owner/clients/${params.clientId}/plan`);
  },
  findMonthFinance: async ({ queries }: FindMonthFinanceRequestData): Promise<MonthFinance> => {
    const response = await api.get("/owner/finance", { params: queries });
    return response.data;
  },
};
