import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";
import type { FC } from "react";
import { formatMoney } from "../adsUtils";
import { useSpendStatus } from "./useSpendStatus";

/**
 * Barra "gasto do mês x teto" no topo de Anúncios. Só aparece quando há teto nas travas. A previsão soma o gasto até
 * ontem com a verba diária ligada até o fim do mês.
 */
export const SpendCapBar: FC<{ accountId: string }> = ({ accountId }) => {
  const { data } = useSpendStatus(accountId);
  if (!data || (!data.maxAccountMonthlySpend && !data.maxAccountDailySpend)) return null;

  const money = (value: number) => formatMoney(value, data.currency);
  const monthlyCap = data.maxAccountMonthlySpend;
  const spentPercent = monthlyCap ? Math.min(100, (data.monthSpend / monthlyCap) * 100) : 0;
  const forecastPercent = monthlyCap ? Math.min(100, (data.forecastMonthSpend / monthlyCap) * 100) : 0;
  const isOverForecast = !!monthlyCap && data.forecastMonthSpend > monthlyCap;
  const isOverDaily = !!data.maxAccountDailySpend && data.dailyBudget > data.maxAccountDailySpend;

  return (
    <div className="space-y-1.5 border-b px-3 py-2 sm:px-4" aria-label="Gasto do mês e teto da conta">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1 font-medium">
          <Gauge className="text-primary h-3.5 w-3.5" />
          Gasto do mês
        </span>
        {monthlyCap ? (
          <span className="tabular-nums">
            {money(data.monthSpend)} de {money(monthlyCap)} · previsão até o fim do mês:{" "}
            <span className={cn("font-medium", isOverForecast && "text-destructive")}>{money(data.forecastMonthSpend)}</span>
          </span>
        ) : (
          <span className="tabular-nums">{money(data.monthSpend)} até ontem</span>
        )}
        {data.maxAccountDailySpend && (
          <span className={cn("tabular-nums", isOverDaily && "text-destructive font-medium")}>
            Verba por dia ligada: {money(data.dailyBudget)} de {money(data.maxAccountDailySpend)}
          </span>
        )}
      </div>
      {monthlyCap && (
        <div
          className="bg-muted relative h-1.5 overflow-hidden rounded-full"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={monthlyCap}
          aria-valuenow={data.monthSpend}
          aria-label="Gasto do mês contra o teto"
        >
          {/* Previsão clara por baixo; o já gasto por cima */}
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full", isOverForecast ? "bg-destructive/30" : "bg-primary/25")}
            style={{ width: `${forecastPercent}%` }}
          />
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full", spentPercent >= 100 ? "bg-destructive" : "bg-primary")}
            style={{ width: `${spentPercent}%` }}
          />
        </div>
      )}
      {(isOverForecast || isOverDaily) && (
        <p className="text-destructive text-xs">
          A conta já passa do teto: nada que aumente a verba será aplicado. Pausar e reduzir continuam liberados.
        </p>
      )}
    </div>
  );
};
