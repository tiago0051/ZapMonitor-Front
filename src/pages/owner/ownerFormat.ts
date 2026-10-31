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
