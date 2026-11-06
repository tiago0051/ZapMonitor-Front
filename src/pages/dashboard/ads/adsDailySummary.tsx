import { ErrorState, LoadingState } from "@/components/state-message";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useState, type FC } from "react";
import { addDaysToDate, dateInputClassName, formatCount, formatMoney, percentChange, shortDate, todayInTimeZone } from "./adsUtils";

const alertStyle: Record<AdAlertSeverity, { icon: typeof Info; className: string }> = {
  critical: {
    icon: AlertOctagon,
    className: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  },
  info: { icon: Info, className: "border-border bg-muted/40" },
};

type MetricProps = {
  label: string;
  value: string;
  current: number;
  base: number;
  // Para custos, subir é ruim
  lowerIsBetter?: boolean;
};

const Metric: FC<MetricProps> = ({ label, value, current, base, lowerIsBetter }) => {
  const change = percentChange(current, base);
  const isGood = change !== null && (lowerIsBetter ? change < 0 : change > 0);

  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p
        className={cn(
          "text-xs tabular-nums",
          change === null || change === 0 ? "text-muted-foreground" : isGood ? "text-green-700" : "text-red-700",
        )}
      >
        {change === null ? "sem base na semana" : `${change > 0 ? "+" : ""}${change}% vs. média de 7 dias`}
      </p>
    </div>
  );
};

/** Um dia da conta comparado à média dos 7 anteriores, com o que pede atenção. */
export const AdsDailySummary: FC<{ account: AdAccount }> = ({ account }) => {
  const { client } = useClientContext();
  const yesterday = addDaysToDate(todayInTimeZone(account.timezoneName), -1);
  const [date, setDate] = useState(yesterday);

  const summaryQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "summary", client.id, account.id, date],
    queryFn: () => metaAdsService.findDailySummary({ params: { clientId: client.id, accountId: account.id }, queries: { date } }),
  });
  const summary = summaryQuery.data;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">Resumo do dia</h2>
        <Input
          type="date"
          aria-label="Dia do resumo"
          value={date}
          max={yesterday}
          onChange={(event) => event.target.value && setDate(event.target.value)}
          className={cn(dateInputClassName, "w-44")}
        />
        {date === yesterday && <span className="text-muted-foreground text-xs">ontem, no fuso da conta</span>}
      </div>

      {summaryQuery.isLoading && <LoadingState className="justify-start py-2" />}
      {summaryQuery.isError && (
        <ErrorState
          message="Não foi possível montar o resumo."
          onRetry={() => summaryQuery.refetch()}
          isRetrying={summaryQuery.isFetching}
        />
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <Metric
              label="Gasto"
              value={formatMoney(summary.day.spend, summary.currency)}
              current={summary.day.spend}
              base={summary.previousAverage.spend}
            />
            <Metric
              label="Conversas (Meta)"
              value={formatCount(summary.day.metaConversations)}
              current={summary.day.metaConversations}
              base={summary.previousAverage.metaConversations}
            />
            <Metric
              label="Custo por conversa"
              value={formatMoney(summary.day.costPerConversation, summary.currency)}
              current={summary.day.costPerConversation ?? 0}
              base={summary.previousAverage.costPerConversation ?? 0}
              lowerIsBetter
            />
            <Metric
              label="Leads (Meta)"
              value={formatCount(summary.day.metaLeads)}
              current={summary.day.metaLeads}
              base={summary.previousAverage.metaLeads}
            />
            <Metric
              label="Negócios criados"
              value={formatCount(summary.day.deals)}
              current={summary.day.deals}
              base={summary.previousAverage.deals}
            />
            <Metric
              label="Ganhos"
              value={`${formatCount(summary.day.wonDeals)} · ${formatMoney(summary.day.wonValue, summary.currency)}`}
              current={summary.day.wonValue}
              base={summary.previousAverage.wonValue}
            />
          </div>

          {summary.alerts.length === 0 ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Nada pede atenção em {shortDate(summary.date)}.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.alerts.map((alert, index) => {
                const { icon: Icon, className } = alertStyle[alert.severity];
                return (
                  <li key={`${alert.title}-${index}`} className={cn("flex gap-2 rounded-lg border p-3 text-sm", className)}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-xs opacity-80">{alert.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
};
