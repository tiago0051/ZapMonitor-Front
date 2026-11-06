// Vencimento do plano de um tenant
type PlanStatus = {
  // YYYY-MM-DD, último dia pago; nulo quando o plano não tem vencimento
  dueDate: string | null;
  // 0 no dia do vencimento, negativo depois
  daysUntilDue: number | null;
  // Venceu: os usuários do tenant (menos implantadores) estão sem acesso
  expired: boolean;
  // Meses que o Renovar soma por padrão
  renewalMonths: number;
};

type ClientPlanRenewal = {
  id: string;
  previousDueDate: string | null;
  newDueDate: string;
  months: number;
  renewedByName: string | null;
  createdAt: string;
};
