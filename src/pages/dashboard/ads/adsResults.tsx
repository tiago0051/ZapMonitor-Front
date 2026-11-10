import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  addDaysToDate,
  effectiveStatusInfo,
  dateInputClassName,
  formatCount,
  formatMoney,
  reportLevelLabel,
  shortDate,
  statusToneClassName,
  todayInTimeZone,
} from "./adsUtils";

import { AdsSignalReadiness } from "./adsSignalReadiness";
import { AdsAttendanceInsights } from "./adsAttendanceInsights";
import { MetricHelp } from "./components/metricHelp";
import { useSyncAccount } from "./components/useSyncAccount";

const PRESETS = [7, 14, 30, 90] as const;

const Total: FC<{ label: ReactNode; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-lg border p-3">
    <p className="text-muted-foreground flex items-center gap-1 text-xs">{label}</p>
    <p className="text-lg font-semibold tabular-nums">{value}</p>
    {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
  </div>
);

const HeadWithHelp: FC<{ label: string; term: Parameters<typeof MetricHelp>[0]["term"] }> = ({ label, term }) => (
  <span className="inline-flex items-center gap-1">
    {label}
    <MetricHelp term={term} />
  </span>
);

const StatusBadge: FC<{ row: AdReportRow }> = ({ row }) => {
  const status = row.effectiveStatus ? effectiveStatusInfo(row.effectiveStatus) : null;
  return status ? (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", statusToneClassName[status.tone])}>{status.label}</span>
  ) : (
    <span className="text-muted-foreground text-[10px]">Fora da estrutura atual</span>
  );
};

const CardMetric: FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div>
    <dt className="text-muted-foreground text-[11px]">{label}</dt>
    <dd className={cn("tabular-nums", highlight ? "text-base font-semibold" : "text-sm")}>{value}</dd>
  </div>
);

/** No celular, cada linha vira um cartão com as métricas principais; o resto abre em "ver mais". */
const ResultCard: FC<{ row: AdReportRow; currency: string }> = ({ row, currency }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div className="space-y-1">
        <p className="line-clamp-2 text-sm font-medium">{row.name}</p>
        <StatusBadge row={row} />
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <CardMetric label="Custo por venda" value={formatMoney(row.costPerWonDeal, currency)} highlight />
        <CardMetric label="Gasto" value={formatMoney(row.spend, currency)} highlight />
        <CardMetric label="Vendas" value={`${formatCount(row.wonDeals)} · ${formatMoney(row.wonValue, currency)}`} />
        <CardMetric label="Conversas" value={formatCount(row.metaConversations)} />
      </dl>
      {isOpen && (
        <dl className="grid grid-cols-2 gap-2 border-t pt-2">
          <CardMetric label="Custo por conversa" value={formatMoney(row.costPerConversation, currency)} />
          <CardMetric label="CTR" value={row.ctr === null ? "—" : `${formatCount(row.ctr, 2)}%`} />
          <CardMetric label="Chegaram ao WhatsApp" value={formatCount(row.crmConversations)} />
          <CardMetric label="Leads" value={`${formatCount(row.metaLeads)} (${formatCount(row.crmLeads)} no CRM)`} />
          <CardMetric label="Negócios" value={formatCount(row.deals)} />
          <CardMetric label="Qualificados" value={formatCount(row.qualifiedDeals)} />
          <CardMetric label="ROAS" value={row.roas === null ? "—" : `${formatCount(row.roas, 2)}x`} />
        </dl>
      )}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="text-primary focus-visible:ring-ring/50 flex items-center gap-1 rounded text-xs font-medium outline-none focus-visible:ring-[3px]"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
        {isOpen ? "Ver menos" : "Ver mais"}
      </button>
    </li>
  );
};

/** Métricas da Meta lado a lado com o que os anúncios geraram no CRM, no período escolhido. */
export const AdsResults: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const isMobile = useIsMobile();
  const syncAccount = useSyncAccount();
  const today = todayInTimeZone(account.timezoneName);
  const [level, setLevel] = useState<AdReportLevel>("campaign");
  const [startDate, setStartDate] = useState(addDaysToDate(today, -29));
  const [endDate, setEndDate] = useState(today);

  const reportQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "report", client.id, account.id, level, startDate, endDate],
    queryFn: () =>
      metaAdsService.findReport({ params: { clientId: client.id, accountId: account.id }, queries: { level, startDate, endDate } }),
    enabled: startDate <= endDate,
  });
  const report = reportQuery.data;
  const currency = report?.currency ?? account.currency;

  const applyPreset = (days: number) => {
    setStartDate(addDaysToDate(today, -(days - 1)));
    setEndDate(today);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="mr-2 text-base font-semibold">Resultados</h2>
        <div className="flex rounded-md border p-0.5" role="group" aria-label="Período">
          {PRESETS.map((days) => {
            const isActive = endDate === today && startDate === addDaysToDate(today, -(days - 1));
            return (
              <button
                key={days}
                type="button"
                aria-pressed={isActive}
                onClick={() => applyPreset(days)}
                className={cn(
                  "focus-visible:ring-ring/50 rounded px-2.5 py-1.5 text-xs outline-none focus-visible:ring-[3px] sm:px-2 sm:py-1",
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {days} dias
              </button>
            );
          })}
        </div>
        <div className="grid w-full grid-cols-2 gap-1 sm:flex sm:w-auto sm:items-center">
          <Input
            type="date"
            aria-label="Início do período"
            value={startDate}
            max={endDate}
            onChange={(event) => event.target.value && setStartDate(event.target.value)}
            className={dateInputClassName}
          />
          <Input
            type="date"
            aria-label="Fim do período"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(event) => event.target.value && setEndDate(event.target.value)}
            className={dateInputClassName}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="ads-level" className="text-xs">
            Agrupar por
          </Label>
          <select
            id="ads-level"
            value={level}
            onChange={(event) => setLevel(event.target.value as AdReportLevel)}
            className={cn(crmSelectClassName, "h-8 w-36")}
          >
            {(Object.keys(reportLevelLabel) as AdReportLevel[]).map((option) => (
              <option key={option} value={option}>
                {reportLevelLabel[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {reportQuery.isLoading && <LoadingState className="justify-start py-2" />}
      {reportQuery.isError && (
        <ErrorState
          message="Não foi possível carregar os resultados."
          onRetry={() => reportQuery.refetch()}
          isRetrying={reportQuery.isFetching}
        />
      )}

      {report && (
        <>
          <div className="bg-primary/5 border-primary/30 flex flex-wrap items-end justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
                Custo por venda
                <MetricHelp term="CPA" />
              </p>
              <p className="text-3xl font-semibold tabular-nums">{formatMoney(report.total.costPerWonDeal, currency)}</p>
              <p className="text-muted-foreground text-xs">
                {report.total.wonDeals
                  ? `${formatMoney(report.total.spend, currency)} gastos ÷ ${formatCount(report.total.wonDeals)} venda(s) ganha(s) no CRM`
                  : "Nenhuma venda de anúncio ganha no CRM no período"}
              </p>
            </div>
            <p className="text-muted-foreground max-w-md text-xs">
              É a medida principal: as sugestões, o piloto e os testes comparam campanhas, conjuntos e anúncios por ela. A Meta mostra o
              custo por conversa ({formatMoney(report.total.costPerConversation, currency)}), que não diz quem comprou.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            <Total label="Gasto" value={formatMoney(report.total.spend, currency)} />
            <Total
              label="Conversas"
              value={formatCount(report.total.metaConversations)}
              hint={`${formatCount(report.total.crmConversations)} chegaram ao WhatsApp`}
            />
            <Total
              label={<HeadWithHelp label="Custo por conversa" term="CPA" />}
              value={formatMoney(report.total.costPerConversation, currency)}
            />
            <Total
              label="Leads"
              value={formatCount(report.total.metaLeads)}
              hint={`${formatCount(report.total.crmLeads)} recebidos no CRM`}
            />
            <Total
              label="Negócios"
              value={formatCount(report.total.deals)}
              hint={`${formatCount(report.total.qualifiedDeals)} qualificados · ${formatMoney(report.total.costPerQualifiedDeal, currency)} cada`}
            />
            <Total
              label="Ganhos"
              value={formatMoney(report.total.wonValue, currency)}
              hint={`${formatCount(report.total.wonDeals)} negócio(s) · ${formatMoney(report.total.costPerWonDeal, currency)} cada`}
            />
            <Total
              label={<HeadWithHelp label="ROAS" term="ROAS" />}
              value={report.total.roas === null ? "—" : `${formatCount(report.total.roas, 2)}x`}
              hint="Valor ganho ÷ gasto"
            />
          </div>

          {report.days.length > 1 && (
            <div className="rounded-lg border p-3">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={report.days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="spend"
                    tick={{ fontSize: 11 }}
                    width={64}
                    tickFormatter={(value: number) => formatMoney(value, currency).replace(/,\d{2}$/, "")}
                  />
                  <YAxis yAxisId="results" orientation="right" tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(value) => shortDate(String(value))}
                    formatter={(value, name) => (name === "Gasto" ? formatMoney(Number(value), currency) : formatCount(Number(value)))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="spend" dataKey="spend" name="Gasto" fill="#93c5fd" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="results" dataKey="metaConversations" name="Conversas" stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line yAxisId="results" dataKey="metaLeads" name="Leads" stroke="#9333ea" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {report.rows.length === 0 ? (
            <EmptyState
              title="Sem resultados no período"
              description="As métricas chegam na sincronização da conta, que roda a cada 6 horas. Se a conta teve anúncios rodando, sincronize agora."
              action={
                can("ads.manage") && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={syncAccount.isPending}
                    onClick={() => syncAccount.mutate({ params: { clientId: client.id, accountId: account.id } })}
                  >
                    <RefreshCw className={cn("h-4 w-4", syncAccount.isPending && "animate-spin")} />
                    Sincronizar agora
                  </Button>
                )
              }
            />
          ) : isMobile ? (
            <ul className="space-y-2" aria-label={reportLevelLabel[level]}>
              {report.rows.map((row) => (
                <ResultCard key={row.id} row={row} currency={currency} />
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-40 sm:min-w-56">{reportLevelLabel[level].slice(0, -1)}</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">
                      <HeadWithHelp label="CTR" term="CTR" />
                    </TableHead>
                    <TableHead className="text-right">Conversas</TableHead>
                    <TableHead className="text-right">
                      <HeadWithHelp label="Custo/conversa" term="CPA" />
                    </TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Negócios</TableHead>
                    <TableHead className="text-right">Qualificados</TableHead>
                    <TableHead className="text-right">Ganhos</TableHead>
                    <TableHead className="text-right">
                      <HeadWithHelp label="Custo/ganho" term="CPA" />
                    </TableHead>
                    <TableHead className="text-right">
                      <HeadWithHelp label="ROAS" term="ROAS" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row) => {
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="line-clamp-2 text-sm font-medium" title={row.name}>
                            {row.name}
                          </p>
                          <StatusBadge row={row} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.spend, currency)}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.ctr === null ? "—" : `${formatCount(row.ctr, 2)}%`}</TableCell>
                        <TableCell className="text-right tabular-nums" title={`${row.crmConversations} chegaram ao WhatsApp`}>
                          {formatCount(row.metaConversations)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.costPerConversation, currency)}</TableCell>
                        <TableCell className="text-right tabular-nums" title={`${row.crmLeads} recebidos no CRM`}>
                          {formatCount(row.metaLeads)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCount(row.deals)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCount(row.qualifiedDeals)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          {formatCount(row.wonDeals)} · {formatMoney(row.wonValue, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.costPerWonDeal, currency)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.roas === null ? "—" : `${formatCount(row.roas, 2)}x`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Conversas e leads são contados pela Meta. Negócios, qualificados e ganhos vêm do CRM: negócios criados no período a partir de um
            anúncio, e qualificados são os que entraram numa etapa com o evento QualifiedLead ou passaram do corte de nota da IA.
          </p>
          <AdsSignalReadiness account={account} />
          <AdsAttendanceInsights account={account} startDate={startDate} endDate={endDate} />
        </>
      )}
    </section>
  );
};
