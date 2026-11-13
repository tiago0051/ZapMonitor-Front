import { endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";

export type Period = { start: string; end: string };

const toInputDate = (date: Date) => format(date, "yyyy-MM-dd");

export const periodPresets: { label: string; build: () => Period }[] = [
  { label: "Hoje", build: () => ({ start: toInputDate(new Date()), end: toInputDate(new Date()) }) },
  { label: "Últimos 7 dias", build: () => ({ start: toInputDate(subDays(new Date(), 6)), end: toInputDate(new Date()) }) },
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

export const thisMonthPeriod = () => periodPresets[3].build();

export const isValidPeriod = (period: Period) => !!period.start && !!period.end && period.start <= period.end;

/** O dia inteiro no fuso do navegador; nulo enquanto o período é inválido. */
export const toPeriodQuery = (period: Period) =>
  isValidPeriod(period)
    ? { startDate: startOfDay(parseISO(period.start)).toISOString(), endDate: endOfDay(parseISO(period.end)).toISOString() }
    : null;
