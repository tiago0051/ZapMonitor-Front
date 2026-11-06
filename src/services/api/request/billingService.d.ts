type SavePriceTableRequestBody = {
  effectiveFrom: string;
  notes: string | null;
  saleCommissionFixed: number;
  saleCommissionMonthlyFees: number;
  recurringCommissionPercent: number;
  items: PriceTableItem[];
  fixedCosts: PriceTableFixedCost[];
};

type CreatePriceTableRequestData = {
  body: SavePriceTableRequestBody;
};

type UpdatePriceTableRequestData = {
  params: PriceTableRequestParams;
  body: SavePriceTableRequestBody;
};

type DeletePriceTableRequestData = {
  params: PriceTableRequestParams;
};

type PriceTableRequestParams = {
  priceTableId: string;
};

type ClientPlanRequestParams = {
  clientId: string;
};

type FindClientPlanRequestData = {
  params: ClientPlanRequestParams;
};

type SaveClientPlanRequestData = {
  params: ClientPlanRequestParams;
  body: SaveClientPlanRequestBody;
};

type SaveClientPlanRequestBody = {
  startedAt: string;
  items: { resource: BillingResource; quantity: number }[];
  // Último dia pago (YYYY-MM-DD); nulo tira o vencimento
  dueDate?: string | null;
  renewalMonths?: number;
  firstPaymentToImplanter?: boolean;
  // Modelo usado na contratação; nulo para plano montado à mão
  planTemplateId?: string | null;
  // Omitido mantém; vazio tira todos
  adjustments?: PlanAdjustment[];
};

type SavePlanTemplateRequestBody = {
  name: string;
  description: string | null;
  renewalMonths: number;
  firstPaymentToImplanter: boolean;
  isActive: boolean;
  items: { resource: BillingResource; quantity: number }[];
  adjustments: PlanAdjustment[];
};

type PlanTemplateRequestParams = {
  planTemplateId: string;
};

type CreatePlanTemplateRequestData = {
  body: SavePlanTemplateRequestBody;
};

type UpdatePlanTemplateRequestData = {
  params: PlanTemplateRequestParams;
  body: SavePlanTemplateRequestBody;
};

type DeletePlanTemplateRequestData = {
  params: PlanTemplateRequestParams;
};

type RenewClientPlanRequestData = {
  params: ClientPlanRequestParams;
  body: { months?: number };
};

type EndClientPlanRequestData = {
  params: ClientPlanRequestParams;
};

type FindMonthFinanceRequestData = {
  queries: OwnerPeriodRequestQuery;
};
