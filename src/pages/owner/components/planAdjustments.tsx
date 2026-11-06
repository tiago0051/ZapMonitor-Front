import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { billingResourceLabel, billingResources } from "@/contants/billingContants";
import { currentMonthKey, describeAdjustment, formatMonth, isAdjustmentValidIn, isInvalidValidity } from "../planAdjustmentFormat";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { FC } from "react";
import { formatCurrency } from "../ownerFormat";

export const MAX_PLAN_ADJUSTMENTS = 20;

export const selectClassName = "border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

export const PlanAdjustmentsEditor: FC<{
  adjustments: PlanAdjustment[];
  onChange: (adjustments: PlanAdjustment[]) => void;
  idPrefix: string;
  // Plano do tenant: vigência por mês (de/até); modelo: primeiros N meses do contrato
  validity: "months" | "duration";
}> = ({ adjustments, onChange, idPrefix, validity }) => {
  const thisMonth = currentMonthKey();
  const update = (index: number, change: Partial<PlanAdjustment>) =>
    onChange(adjustments.map((adjustment, current) => (current === index ? { ...adjustment, ...change } : adjustment)));

  const add = () => onChange([...adjustments, { type: "DISCOUNT", mode: "PERCENT", value: 10, resource: null, description: null }]);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Descontos e acréscimos</p>
          <p className="text-muted-foreground text-xs">
            Sobre um recurso, mudam só o valor dele. Sobre o total, valem depois: primeiro os percentuais, depois os valores fixos.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={adjustments.length >= MAX_PLAN_ADJUSTMENTS} onClick={add}>
          <Plus />
          Adicionar
        </Button>
      </div>

      {adjustments.length === 0 && <p className="text-muted-foreground text-xs italic">Sem ajustes: vale o preço da tabela.</p>}

      {adjustments.map((adjustment, index) => {
        const isInvalid =
          !(adjustment.value > 0) || (adjustment.type === "DISCOUNT" && adjustment.mode === "PERCENT" && adjustment.value > 100);
        const isValidityInvalid = isInvalidValidity(adjustment);
        const isOutOfThisMonth = validity === "months" && !isAdjustmentValidIn(adjustment, thisMonth);

        return (
          <div key={index} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_5rem_6.5rem_1.4fr_auto] sm:items-start">
            <select
              aria-label="Tipo do ajuste"
              className={selectClassName}
              value={adjustment.type}
              onChange={(event) => update(index, { type: event.target.value as PlanAdjustmentType })}
            >
              <option value="DISCOUNT">Desconto</option>
              <option value="SURCHARGE">Acréscimo</option>
            </select>
            <select
              aria-label="Forma do ajuste"
              className={selectClassName}
              value={adjustment.mode}
              onChange={(event) => update(index, { mode: event.target.value as PlanAdjustmentMode })}
            >
              <option value="PERCENT">%</option>
              <option value="FIXED">R$</option>
            </select>
            <div>
              <Input
                id={`${idPrefix}-adjustment-${index}-value`}
                aria-label="Valor do ajuste"
                type="number"
                min={0.01}
                step={0.01}
                max={adjustment.type === "DISCOUNT" && adjustment.mode === "PERCENT" ? 100 : undefined}
                value={Number.isNaN(adjustment.value) ? "" : adjustment.value}
                aria-invalid={isInvalid}
                onChange={(event) => update(index, { value: event.target.valueAsNumber })}
              />
            </div>
            <select
              aria-label="Sobre o quê"
              className={selectClassName}
              value={adjustment.resource ?? ""}
              onChange={(event) => update(index, { resource: (event.target.value || null) as BillingResource | null })}
            >
              <option value="">Sobre o total</option>
              {billingResources.map((resource) => (
                <option key={resource} value={resource}>
                  Sobre {billingResourceLabel[resource]}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remover ajuste"
              onClick={() => onChange(adjustments.filter((_, current) => current !== index))}
            >
              <Trash2 />
            </Button>
            <Input
              className="sm:col-span-5"
              aria-label="Motivo do ajuste"
              placeholder="Motivo (opcional), ex.: desconto de lançamento"
              maxLength={120}
              value={adjustment.description ?? ""}
              onChange={(event) => update(index, { description: event.target.value })}
            />
            {validity === "months" ? (
              <div className="flex flex-wrap items-center gap-2 text-xs sm:col-span-5">
                <span className="text-muted-foreground">Vale de</span>
                <Input
                  type="month"
                  aria-label="Primeiro mês em que vale"
                  className="h-8 w-40"
                  value={adjustment.validFrom ?? ""}
                  onChange={(event) => update(index, { validFrom: event.target.value || null })}
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  type="month"
                  aria-label="Último mês em que vale"
                  className="h-8 w-40"
                  value={adjustment.validUntil ?? ""}
                  aria-invalid={isValidityInvalid}
                  onChange={(event) => update(index, { validUntil: event.target.value || null })}
                />
                <span className="text-muted-foreground">Vazio: desde já e sem fim.</span>
                {isOutOfThisMonth && !isValidityInvalid && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    Não vale em {formatMonth(thisMonth)}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs sm:col-span-5">
                <span className="text-muted-foreground">Vale nos primeiros</span>
                <Input
                  type="number"
                  aria-label="Meses em que vale"
                  className="h-8 w-20"
                  min={1}
                  max={60}
                  value={adjustment.durationMonths ?? ""}
                  onChange={(event) =>
                    update(index, { durationMonths: Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber })
                  }
                />
                <span className="text-muted-foreground">meses do contrato. Vazio: sempre.</span>
              </div>
            )}
            {isValidityInvalid && <p className="text-destructive text-xs sm:col-span-5">O mês final vem antes do inicial.</p>}
            {isInvalid && (
              <p className="text-destructive text-xs sm:col-span-5">
                {adjustment.value > 100 ? "O desconto não pode passar de 100%." : "Informe um valor maior que zero."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Tabela, cada ajuste com quanto mudou e a mensalidade final. */
export const PlanPriceSummary: FC<{ price: PlanPrice; className?: string }> = ({ price, className }) => (
  <div className={cn("grid gap-1 text-sm", className)}>
    {price.adjustments.length > 0 && (
      <>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Pela tabela em vigor</span>
          <span className="tabular-nums">{formatCurrency(price.listPrice)}</span>
        </div>
        {price.adjustments.map((adjustment, index) => (
          <div key={index} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{describeAdjustment(adjustment)}</span>
            <span className="tabular-nums">
              {adjustment.amount < 0 ? "−" : "+"}
              {formatCurrency(Math.abs(adjustment.amount))}
            </span>
          </div>
        ))}
      </>
    )}
    <div className="flex justify-between gap-4 border-t pt-1">
      <span>Mensalidade</span>
      <span className="text-base font-semibold tabular-nums">{formatCurrency(price.total)}</span>
    </div>
  </div>
);

/** Conjuntos de ajustes que já valeram no contrato e foram trocados. */
export const PlanAdjustmentHistoryList: FC<{ history: PlanAdjustmentHistory[] }> = ({ history }) =>
  history.length > 0 && (
    <details className="rounded-md border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Histórico de descontos e acréscimos</summary>
      <ul className="mt-2 grid gap-2">
        {history.map((entry) => (
          <li key={`${entry.startsAt}-${entry.endsAt}`} className="grid gap-0.5">
            <span className="text-muted-foreground text-xs">
              De {format(new Date(entry.startsAt), "dd/MM/yyyy")} a {format(new Date(entry.endsAt), "dd/MM/yyyy")}
            </span>
            {entry.adjustments.length === 0 ? (
              <span className="text-muted-foreground text-xs italic">Sem ajustes</span>
            ) : (
              entry.adjustments.map((adjustment, index) => (
                <span key={index} className="text-xs">
                  {describeAdjustment(adjustment)}
                </span>
              ))
            )}
          </li>
        ))}
      </ul>
    </details>
  );
