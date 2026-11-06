import { billingResourceLabel } from "@/contants/billingContants";
import { formatCurrency } from "./ownerFormat";

const formatValue = (adjustment: PlanAdjustment) =>
  adjustment.mode === "PERCENT" ? `${adjustment.value.toLocaleString("pt-BR")}%` : formatCurrency(adjustment.value);

/** Ex.: "Desconto de 10% sobre o total (Lançamento)". */
export const describeAdjustment = (adjustment: PlanAdjustment) =>
  `${adjustment.type === "DISCOUNT" ? "Desconto" : "Acréscimo"} de ${formatValue(adjustment)} sobre ${
    adjustment.resource ? billingResourceLabel[adjustment.resource] : "o total"
  }${adjustment.description ? ` (${adjustment.description})` : ""}`;

/** Só os campos que o servidor recebe. */
export const toAdjustmentBody = (adjustments: PlanAdjustment[]): PlanAdjustment[] =>
  adjustments.map(({ type, mode, value, resource, description }) => ({
    type,
    mode,
    value,
    resource: resource ?? null,
    description: description?.trim() || null,
  }));

export const hasInvalidAdjustment = (adjustments: PlanAdjustment[]) =>
  adjustments.some(
    (adjustment) => !(adjustment.value > 0) || (adjustment.type === "DISCOUNT" && adjustment.mode === "PERCENT" && adjustment.value > 100),
  );
