import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  addDaysToDate,
  effectiveStatusInfo,
  formatCount,
  formatMoney,
  reportLevelLabel,
  shortDate,
  statusToneClassName,
  todayInTimeZone,
} from "./adsUtils";

const PRESETS = [7, 14, 30, 90] as const;

const Total: FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-lg border p-3">
    <p className="text-muted-foreground text-xs">{label}</p>
    <p className="text-lg font-semibold tabular-nums">{value}</p>
    {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
  </div>
);

/** Métricas da Meta lado a lado com o que os anúncios geraram no CRM, no período escolhido. */
export const AdsResults: FC<{ account: AdAccount }> = ({ account }) => {
  const { client } = useClientContext();
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
                  "rounded px-2.5 py-1.5 text-xs sm:px-2 sm:py-1",
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {days} dias
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="date"
            aria-label="Início do período"
            value={startDate}
            max={endDate}
            onChange={(event) => event.target.value && setStartDate(event.target.value)}
            className="h-8 w-36"
          />
          <Input
            type="date"
            aria-label="Fim do período"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(event) => event.target.value && setEndDate(event.target.value)}
            className="h-8 w-36"
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
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            <Total label="Gasto" value={formatMoney(report.total.spend, currency)} />
            <Total
              label="Conversas"
              value={formatCount(report.total.metaConversations)}
              hint={`${formatCount(report.total.crmConversations)} chegaram ao WhatsApp`}
            />
            <Total label="Custo por conversa" value={formatMoney(report.total.costPerConversation, currency)} />
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
              label="ROAS"
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
              description="As métricas chegam na sincronização da conta, que roda a cada 6 horas ou pelo botão Sincronizar agora."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-40 sm:min-w-56">{reportLevelLabel[level].slice(0, -1)}</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Conversas</TableHead>
                    <TableHead className="text-right">Custo/conversa</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Negócios</TableHead>
                    <TableHead className="text-right">Qualificados</TableHead>
                    <TableHead className="text-right">Ganhos</TableHead>
                    <TableHead className="text-right">Custo/ganho</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((row) => {
                    const status = row.effectiveStatus ? effectiveStatusInfo(row.effectiveStatus) : null;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="line-clamp-2 text-sm font-medium" title={row.name}>
                            {row.name}
                          </p>
                          {status ? (
                            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", statusToneClassName[status.tone])}>
                              {status.label}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">Fora da estrutura atual</span>
                          )}
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
            anúncio, e qualificados são os que entraram numa etapa do funil com o evento QualifiedLead configurado.
          </p>
        </>
      )}
    </section>
  );
};
