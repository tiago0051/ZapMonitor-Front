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
};

type EndClientPlanRequestData = {
  params: ClientPlanRequestParams;
};

type FindMonthFinanceRequestData = {
  queries: OwnerPeriodRequestQuery;
};
