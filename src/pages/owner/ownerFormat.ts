import { endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";

export const formatNumber = (value: number) => value.toLocaleString("pt-BR");

export type Period = { start: string; end: string };

const toInputDate = (date: Date) => format(date, "yyyy-MM-dd");

export const periodPresets: { label: string; build: () => Period }[] = [
  { label: "Últimos 30 dias", build: () => ({ start: toInputDate(subDays(new Date(), 29)), end: toInputDate(new Date()) }) },
  { label: "Este mês", build: () => ({ start: toInputDate(startOfMonth(new Date())), end: toInputDate(new Date()) }) },
  {
    label: "Mês passado",
    build: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { start: toInputDate(startOfMonth(lastMonth)), end: toInputDate(endOfMonth(lastMonth)) };
    },
  },
];

/** O dia inteiro no fuso do navegador; nulo quando o início é depois do fim. */
export const toPeriodQuery = (period: Period): OwnerPeriodRequestQuery | null =>
  period.start && period.end && period.start <= period.end
    ? { startDate: startOfDay(parseISO(period.start)).toISOString(), endDate: endOfDay(parseISO(period.end)).toISOString() }
    : null;

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatCurrency = (value: number) => currencyFormatter.format(value);

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Mensalidade de um plano com os preços de uma tabela e os ajustes por cima. Espelha o cálculo do servidor
 * (planPricing.entity.ts), que é o que vale no fechamento:
 * 1. ajustes de um recurso mudam só o valor dele, na ordem em que estão;
 * 2. ajustes do total valem sobre a soma já ajustada: primeiro os percentuais (todos sobre a mesma base), depois os fixos;
 * 3. um desconto nunca deixa um recurso ou o total negativo.
 */
export const calculatePlanPrice = (
  table: PriceTable | undefined,
  quantities: Partial<Record<BillingResource, number>>,
  adjustments: PlanAdjustment[] = [],
): PlanPrice => {
  const lines = new Map(
    (table?.items ?? []).map((item) => {
      const amount = round((quantities[item.resource] ?? 0) * item.unitPrice);
      return [item.resource, { listAmount: amount, amount }];
    }),
  );

  const applied = new Map<PlanAdjustment, number>();
  const apply = (adjustment: PlanAdjustment, base: number, current: number) => {
    const raw = round(adjustment.mode === "PERCENT" ? (base * adjustment.value) / 100 : adjustment.value);
    const amount = adjustment.type === "DISCOUNT" ? -Math.min(raw, current) : raw;
    applied.set(adjustment, amount);
    return round(current + amount);
  };

  for (const adjustment of adjustments) {
    const line = adjustment.resource ? lines.get(adjustment.resource) : undefined;
    if (line) line.amount = apply(adjustment, line.listAmount, line.amount);
  }

  const subtotal = round([...lines.values()].reduce((sum, line) => sum + line.amount, 0));
  const totalAdjustments = adjustments.filter((adjustment) => !adjustment.resource);
  let total = subtotal;
  for (const adjustment of totalAdjustments.filter((item) => item.mode === "PERCENT")) total = apply(adjustment, subtotal, total);
  for (const adjustment of totalAdjustments.filter((item) => item.mode === "FIXED")) total = apply(adjustment, subtotal, total);

  return {
    listPrice: round([...lines.values()].reduce((sum, line) => sum + line.listAmount, 0)),
    adjustments: adjustments.map((adjustment) => ({ ...adjustment, amount: applied.get(adjustment) ?? 0 })),
    total,
  };
};
