type BillingResource =
  | "ACTIVE_USERS"
  | "WHATSAPP_NUMBERS"
  // Números conectados por QR code (WhatsApp Web, não oficial)
  | "WHATSAPP_WEB_NUMBERS"
  | "MONTHLY_SERVICES"
  | "STORAGE_GB"
  | "AI_TOKENS"
  | "API_ACCESS"
  | "CRM_ACCESS"
  | "CRM_PIPELINES"
  | "ADS_ACCESS"
  | "ADS_ACCOUNTS"
  // Milhares de e-mails por mês
  | "EMAIL_SENDS";

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

type PlanAdjustmentType = "DISCOUNT" | "SURCHARGE";

// PERCENT sobre o valor do recurso ou do total; FIXED em reais por mês
type PlanAdjustmentMode = "PERCENT" | "FIXED";

type PlanAdjustment = {
  type: PlanAdjustmentType;
  mode: PlanAdjustmentMode;
  value: number;
  // Nulo vale sobre o total
  resource: BillingResource | null;
  description: string | null;
  // Plano do tenant: meses de vigência (YYYY-MM, inclusive); vazios valem sempre
  validFrom?: string | null;
  validUntil?: string | null;
  // Modelo: vale nos primeiros N meses do contrato; vazio vale sempre
  durationMonths?: number | null;
};

// Conjunto de ajustes que já foi trocado no plano do tenant
type PlanAdjustmentHistory = {
  startsAt: string;
  endsAt: string;
  adjustments: PlanAdjustment[];
};

// Quanto o ajuste mudou a mensalidade: negativo no desconto, positivo no acréscimo
type AppliedPlanAdjustment = PlanAdjustment & { amount: number };

type PlanPrice = {
  // Mensalidade pela tabela, sem ajustes
  listPrice: number;
  adjustments: AppliedPlanAdjustment[];
  total: number;
};

type PlanTemplate = {
  id: string;
  name: string;
  description: string | null;
  renewalMonths: number;
  firstPaymentToImplanter: boolean;
  // Inativo não aparece na hora de contratar
  isActive: boolean;
  items: { resource: BillingResource; quantity: number }[];
  adjustments: PlanAdjustment[];
  // Preço pela tabela em vigor; nulo sem tabela
  price: PlanPrice | null;
  // Tenants contratados com este modelo
  clientPlans: number;
  updatedAt: string;
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
  status: PlanStatus;
  renewals: ClientPlanRenewal[];
  // O primeiro pagamento vai inteiro para o representante, no lugar da comissão de venda
  firstPaymentToImplanter: boolean;
  // Modelo usado na contratação
  planTemplate: { id: string; name: string } | null;
  // Descontos e acréscimos do contrato, inclusive os de vigência futura ou encerrada
  adjustments: PlanAdjustment[];
  // Mensalidade deste mês pela tabela em vigor, só com os ajustes válidos no mês; nula sem plano ou sem tabela
  price: PlanPrice | null;
  // Conjuntos de ajustes já trocados, do mais recente
  adjustmentHistory: PlanAdjustmentHistory[];
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
  // Mensalidade pela tabela, sem os ajustes do plano
  listFee: number;
  // Com os descontos e acréscimos: base das comissões
  monthlyFee: number;
  variableCost: number;
  fixedCostShare: number;
  saleCommission: number;
  // Primeiro pagamento repassado ao representante, no lugar da comissão de venda e da recorrente do mês
  firstPaymentTransfer: number;
  recurringCommission: number;
  profit: number;
};

type ImplanterFinance = OwnerUserSummary & {
  clients: number;
  newClients: number;
  revenue: number;
  saleCommission: number;
  // Primeiro pagamento repassado ao representante, no lugar da comissão de venda e da recorrente do mês
  firstPaymentTransfer: number;
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
  // Primeiro pagamento repassado ao representante, no lugar da comissão de venda e da recorrente do mês
  firstPaymentTransfer: number;
  recurringCommission: number;
  profit: number;
  resources: ResourceFinance[];
  clients: ClientFinance[];
  implanters: ImplanterFinance[];
};
