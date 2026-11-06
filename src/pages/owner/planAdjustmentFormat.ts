import { billingResourceLabel } from "@/contants/billingContants";
import { formatCurrency } from "./ownerFormat";

const formatValue = (adjustment: PlanAdjustment) =>
  adjustment.mode === "PERCENT" ? `${adjustment.value.toLocaleString("pt-BR")}%` : formatCurrency(adjustment.value);

/** 11/2026 de um mês YYYY-MM. */
export const formatMonth = (month: string) => month.split("-").reverse().join("/");

/** O mês atual (YYYY-MM) no fuso de quem usa. */
export const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/** YYYY-MM somado de N meses. */
export const addMonthsToKey = (month: string, months: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** Mesma regra do servidor: dentro da vigência escolhida, ou sem vigência. */
export const isAdjustmentValidIn = (adjustment: PlanAdjustment, month: string) =>
  (!adjustment.validFrom || adjustment.validFrom <= month) && (!adjustment.validUntil || adjustment.validUntil >= month);

/** Ex.: "de 11/2026 a 01/2027", "a partir de 11/2026", "nos 3 primeiros meses". */
export const describeValidity = (adjustment: PlanAdjustment) => {
  if (adjustment.durationMonths)
    return adjustment.durationMonths === 1 ? "no primeiro mês" : `nos ${adjustment.durationMonths} primeiros meses`;
  if (adjustment.validFrom && adjustment.validUntil)
    return adjustment.validFrom === adjustment.validUntil
      ? `em ${formatMonth(adjustment.validFrom)}`
      : `de ${formatMonth(adjustment.validFrom)} a ${formatMonth(adjustment.validUntil)}`;
  if (adjustment.validFrom) return `a partir de ${formatMonth(adjustment.validFrom)}`;
  if (adjustment.validUntil) return `até ${formatMonth(adjustment.validUntil)}`;
  return null;
};

/** Ex.: "Desconto de 10% sobre o total, de 11/2026 a 01/2027 (Lançamento)". */
export const describeAdjustment = (adjustment: PlanAdjustment) => {
  const validity = describeValidity(adjustment);

  return `${adjustment.type === "DISCOUNT" ? "Desconto" : "Acréscimo"} de ${formatValue(adjustment)} sobre ${
    adjustment.resource ? billingResourceLabel[adjustment.resource] : "o total"
  }${validity ? `, ${validity}` : ""}${adjustment.description ? ` (${adjustment.description})` : ""}`;
};

/** Só os campos que o servidor recebe. O plano do tenant manda a vigência em meses; o modelo, a duração. */
export const toAdjustmentBody = (adjustments: PlanAdjustment[], validity: "months" | "duration" = "months"): PlanAdjustment[] =>
  adjustments.map(({ type, mode, value, resource, description, validFrom, validUntil, durationMonths }) => ({
    type,
    mode,
    value,
    resource: resource ?? null,
    description: description?.trim() || null,
    ...(validity === "months"
      ? { validFrom: validFrom || null, validUntil: validUntil || null }
      : { durationMonths: durationMonths && durationMonths > 0 ? durationMonths : null }),
  }));

/** Ao contratar com um modelo, "primeiros N meses" vira a vigência a partir do mês de início. */
export const toTenantAdjustments = (adjustments: PlanAdjustment[], startMonth: string): PlanAdjustment[] =>
  adjustments.map(({ durationMonths, ...adjustment }) => ({
    ...adjustment,
    validFrom: durationMonths ? startMonth : null,
    validUntil: durationMonths ? addMonthsToKey(startMonth, durationMonths - 1) : null,
  }));

export const isInvalidValidity = (adjustment: PlanAdjustment) =>
  !!adjustment.validFrom && !!adjustment.validUntil && adjustment.validFrom > adjustment.validUntil;

export const hasInvalidAdjustment = (adjustments: PlanAdjustment[]) =>
  adjustments.some(
    (adjustment) =>
      !(adjustment.value > 0) ||
      (adjustment.type === "DISCOUNT" && adjustment.mode === "PERCENT" && adjustment.value > 100) ||
      isInvalidValidity(adjustment),
  );
