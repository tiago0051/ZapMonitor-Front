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
  findPlanTemplates: async (): Promise<PlanTemplate[]> => {
    const response = await api.get("/owner/plan-templates");
    return response.data;
  },
  createPlanTemplate: async ({ body }: CreatePlanTemplateRequestData): Promise<PlanTemplate> => {
    const response = await api.post("/owner/plan-templates", body);
    return response.data;
  },
  updatePlanTemplate: async ({ params, body }: UpdatePlanTemplateRequestData): Promise<PlanTemplate> => {
    const response = await api.put(`/owner/plan-templates/${params.planTemplateId}`, body);
    return response.data;
  },
  deletePlanTemplate: async ({ params }: DeletePlanTemplateRequestData): Promise<void> => {
    await api.delete(`/owner/plan-templates/${params.planTemplateId}`);
  },
  findClientPlan: async ({ params }: FindClientPlanRequestData): Promise<ClientPlan> => {
    const response = await api.get(`/owner/clients/${params.clientId}/plan`);
    return response.data;
  },
  saveClientPlan: async ({ params, body }: SaveClientPlanRequestData): Promise<ClientPlan> => {
    const response = await api.put(`/owner/clients/${params.clientId}/plan`, body);
    return response.data;
  },
  renewClientPlan: async ({ params, body }: RenewClientPlanRequestData): Promise<ClientPlan> => {
    const response = await api.post(`/owner/clients/${params.clientId}/plan/renew`, body);
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
