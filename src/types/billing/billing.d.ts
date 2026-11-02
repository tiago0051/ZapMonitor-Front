type BillingResource = "ACTIVE_USERS" | "WHATSAPP_NUMBERS" | "MONTHLY_SERVICES" | "STORAGE_GB" | "AI_TOKENS" | "API_ACCESS";

type PriceTableStatus = "IN_FORCE" | "SCHEDULED" | "PAST";

type PriceTableItem = {
  resource: BillingResource;
  unitCost: number;
  unitPrice: number;
  minimumQuantity: number;
};

type PriceTableFixedCost = {
  name: string;
  monthlyAmount: number;
};

type PriceTable = {
  id: string;
  effectiveFrom: string;
  status: PriceTableStatus;
  notes: string | null;
  saleCommissionFixed: number;
  saleCommissionMonthlyFees: number;
  recurringCommissionPercent: number;
  createdAt: string;
  items: PriceTableItem[];
  fixedCosts: PriceTableFixedCost[];
};

type ClientPlanResource = {
  resource: BillingResource;
  quantity: number;
  // Consumo no mês atual; armazenamento em GB e IA em milhões de tokens
  used: number;
};

type ClientPlan = {
  // Nulo quando o tenant ainda não tem plano e não sofre limites
  startedAt: string | null;
  endedAt: string | null;
  resources: ClientPlanResource[];
};

type ResourceFinance = {
  resource: BillingResource;
  contracted: number;
  used: number;
  revenue: number;
  cost: number;
};

type ClientFinance = {
  id: string;
  name: string;
  implanter: OwnerUserSummary | null;
  isNew: boolean;
  monthlyFee: number;
  variableCost: number;
  fixedCostShare: number;
  saleCommission: number;
  recurringCommission: number;
  profit: number;
};

type ImplanterFinance = OwnerUserSummary & {
  clients: number;
  newClients: number;
  revenue: number;
  saleCommission: number;
  recurringCommission: number;
  // Comissão de venda por tenant novo no mês
  cac: number | null;
  profit: number;
};

type MonthFinance = {
  priceTable: PriceTable | null;
  clientsWithoutPlan: number;
  revenue: number;
  variableCost: number;
  fixedCost: number;
  saleCommission: number;
  recurringCommission: number;
  profit: number;
  resources: ResourceFinance[];
  clients: ClientFinance[];
  implanters: ImplanterFinance[];
};
