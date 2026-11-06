import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";
import { useState, type FC } from "react";
import { formatPlanDate, PLAN_RENEWAL_MONTH_OPTIONS } from "./planExpired";

const selectClassName =
  "border-input dark:bg-input/30 flex h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

/** Situação do vencimento em texto curto, para listas e diálogos. */
export const PlanStatusBadge: FC<{ status: PlanStatus; className?: string }> = ({ status, className }) => {
  if (!status.dueDate) return <span className={cn("text-muted-foreground text-xs", className)}>Sem vencimento</span>;

  const date = formatPlanDate(status.dueDate);
  const tone = status.expired
    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
    : (status.daysUntilDue ?? 99) <= 7
      ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      : "bg-muted text-muted-foreground";
  const text = status.expired
    ? `Vencido em ${date}`
    : status.daysUntilDue === 0
      ? `Vence hoje`
      : `Vence em ${date}${(status.daysUntilDue ?? 99) <= 7 ? ` (${status.daysUntilDue} dia(s))` : ""}`;

  return <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", tone, className)}>{text}</span>;
};

type RenewProps = {
  status: PlanStatus;
  isPending: boolean;
  onRenew: (months: number) => void;
};

/** Escolhe o período (o do contrato por padrão) e renova; o acesso volta na hora. */
export const PlanRenewControl: FC<RenewProps> = ({ status, isPending, onRenew }) => {
  const [months, setMonths] = useState(status.renewalMonths);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Período da renovação"
        className={selectClassName}
        value={months}
        disabled={isPending}
        onChange={(event) => setMonths(Number(event.target.value))}
      >
        {PLAN_RENEWAL_MONTH_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option === 1 ? "+1 mês" : `+${option} meses`}
            {option === status.renewalMonths ? " (contrato)" : ""}
          </option>
        ))}
      </select>
      <Button type="button" size="sm" disabled={isPending} onClick={() => onRenew(months)}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Renovar
      </Button>
    </div>
  );
};
