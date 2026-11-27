import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronDown, RefreshCw } from "lucide-react";
import { useMemo, useState, type FC, type ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  adPlatformLabel,
  effectiveStatusInfo,
  formatCount,
  formatMoney,
  reportLevelLabel,
  shortDate,
  statusToneClassName,
} from "./adsUtils";

import { AdsSignalReadiness } from "./adsSignalReadiness";
import { AdsAttendanceInsights } from "./adsAttendanceInsights";
import { MetricHelp } from "./components/metricHelp";
import { useSyncAccount } from "./components/useSyncAccount";
import type { AdsPeriod } from "./components/adsPeriodPicker";

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

// Total de reuniões com a divisão entre as agendadas pela IA e as manuais (etapa do funil)
const meetingsLabel = (row: AdReportMetrics) =>
  row.meetings ? `${formatCount(row.meetings)} (${formatCount(row.aiMeetings)} IA · ${formatCount(row.manualMeetings)} manuais)` : "0";

// Percentual dos negócios que viraram lead qualificado
const qualifiedRate = (row: Pick<AdReportMetrics, "deals" | "qualifiedDeals">) =>
  row.deals > 0 ? `${formatCount((row.qualifiedDeals / row.deals) * 100, 1)}%` : "—";

type SortKey =
  | "name"
  | "spend"
  | "ctr"
  | "metaConversations"
  | "costPerConversation"
  | "metaLeads"
  | "deals"
  | "qualifiedDeals"
  | "qualifiedRate"
  | "costPerQualifiedDeal"
  | "meetings"
  | "costPerMeeting"
  | "wonValue"
  | "costPerWonDeal"
  | "roas";

type SortDirection = "asc" | "desc";

const sortLabel: Record<SortKey, string> = {
  name: "Nome",
  spend: "Gasto",
  ctr: "CTR",
  metaConversations: "Conversas",
  costPerConversation: "Custo por conversa",
  metaLeads: "Leads",
  deals: "Negócios",
  qualifiedDeals: "Qualificados",
  qualifiedRate: "% qualificados",
  costPerQualifiedDeal: "Custo por qualificado",
  meetings: "Reuniões",
  costPerMeeting: "Custo por reunião",
  wonValue: "Ganhos",
  costPerWonDeal: "Custo por venda",
  roas: "ROAS",
};

// Custos começam do menor (o melhor); o resto, do maior. Nome começa de A a Z.
const defaultDirection = (key: SortKey): SortDirection => (key === "name" || key.startsWith("costPer") ? "asc" : "desc");

const sortValue = (row: AdReportRow, key: SortKey): number | null => {
  if (key === "name") return null;
  if (key === "qualifiedRate") return row.deals > 0 ? row.qualifiedDeals / row.deals : null;
  return row[key];
};

/** Ordena as linhas; sem valor (custo sem base, por exemplo) fica sempre no fim. */
function sortRows(rows: AdReportRow[], key: SortKey | null, direction: SortDirection): AdReportRow[] {
  if (!key) return rows;
  const factor = direction === "asc" ? 1 : -1;

  return [...rows].sort((first, second) => {
    if (key === "name") return factor * first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" });
    const a = sortValue(first, key);
    const b = sortValue(second, key);
    if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
    return factor * (a - b);
  });
}

type StatusFilter = "active" | "inactive" | "all";

const statusFilterLabel: Record<StatusFilter, string> = { active: "Ativos", inactive: "Inativos", all: "Todos" };

// Ativo é o que está rodando agora; pausado, em análise, com problema, arquivado ou fora da estrutura conta como inativo
const isActiveRow = (row: AdReportRow) => row.effectiveStatus === "ACTIVE";

const round = (value: number) => Math.round(value * 100) / 100;
const divide = (numerator: number, denominator: number, multiplier = 1) =>
  denominator > 0 ? round((numerator / denominator) * multiplier) : null;

/** Total das linhas filtradas, com as mesmas contas de custo do servidor. */
function sumRows(rows: AdReportRow[]): AdReportMetrics {
  const sum = (key: keyof AdReportMetrics) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
  const spend = round(sum("spend"));
  const counts = {
    impressions: sum("impressions"),
    clicks: sum("clicks"),
    linkClicks: sum("linkClicks"),
    metaConversations: sum("metaConversations"),
    metaLeads: sum("metaLeads"),
    crmConversations: sum("crmConversations"),
    crmLeads: sum("crmLeads"),
    deals: sum("deals"),
    qualifiedDeals: sum("qualifiedDeals"),
    wonDeals: sum("wonDeals"),
    wonValue: sum("wonValue"),
    meetings: sum("meetings"),
    aiMeetings: sum("aiMeetings"),
    manualMeetings: sum("manualMeetings"),
  };

  return {
    spend,
    ...counts,
    ctr: divide(counts.clicks, counts.impressions, 100),
    cpc: divide(spend, counts.clicks),
    cpm: divide(spend, counts.impressions, 1000),
    costPerConversation: divide(spend, counts.metaConversations),
    costPerLead: divide(spend, counts.metaLeads),
    costPerDeal: divide(spend, counts.deals),
    costPerQualifiedDeal: divide(spend, counts.qualifiedDeals),
    costPerWonDeal: divide(spend, counts.wonDeals),
    costPerMeeting: divide(spend, counts.meetings),
    roas: divide(counts.wonValue, spend),
  };
}

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
          <CardMetric label="Qualificados" value={`${formatCount(row.qualifiedDeals)} · ${qualifiedRate(row)}`} />
          <CardMetric label="Custo por qualificado" value={formatMoney(row.costPerQualifiedDeal, currency)} />
          <CardMetric label="Reuniões" value={meetingsLabel(row)} />
          <CardMetric label="Custo por reunião" value={formatMoney(row.costPerMeeting, currency)} />
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

/** Métricas da plataforma lado a lado com o que os anúncios geraram no CRM, no período escolhido no topo da aba. */
export const AdsResults: FC<{ account: AdAccount; period: AdsPeriod }> = ({ account, period }) => {
  const { client, can } = useClientContext();
  const isMobile = useIsMobile();
  const syncAccount = useSyncAccount();
  const [level, setLevel] = useState<AdReportLevel>("campaign");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const { startDate, endDate } = period;

  const reportQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "report", client.id, account.id, level, startDate, endDate],
    queryFn: () =>
      metaAdsService.findReport({ params: { clientId: client.id, accountId: account.id }, queries: { level, startDate, endDate } }),
    enabled: startDate <= endDate,
  });
  const report = reportQuery.data;
  const currency = report?.currency ?? account.currency;

  const statusCounts = useMemo(() => {
    const active = report?.rows.filter(isActiveRow).length ?? 0;
    return { active, inactive: (report?.rows.length ?? 0) - active, all: report?.rows.length ?? 0 };
  }, [report]);
  // Com filtro, os totais passam a ser só das linhas mostradas; em "Todos" vale o total da conta que vem do servidor
  const rows = useMemo(
    () => (report?.rows ?? []).filter((row) => statusFilter === "all" || isActiveRow(row) === (statusFilter === "active")),
    [report, statusFilter],
  );
  const total = useMemo(() => (report && statusFilter !== "all" ? sumRows(rows) : report?.total), [report, rows, statusFilter]);
  const sortedRows = useMemo(() => sortRows(rows, sortKey, sortDirection), [rows, sortKey, sortDirection]);

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection(defaultDirection(key));
    }
  };

  const sortableHead = (key: SortKey, label: ReactNode, options?: { help?: ReactNode; title?: string; className?: string }) => (
    <TableHead
      className={cn("text-right", options?.className)}
      title={options?.title}
      aria-sort={sortKey === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => sortBy(key)}
          className="hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded outline-none focus-visible:ring-[3px]"
        >
          {label}
          {sortKey === key &&
            (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}
        </button>
        {options?.help}
      </span>
    </TableHead>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h2 className="mr-2 text-base font-semibold">Resultados</h2>
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
        <div className="grid gap-1">
          <Label htmlFor="ads-status" className="text-xs">
            Status
          </Label>
          <select
            id="ads-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className={cn(crmSelectClassName, "h-8 w-36")}
          >
            {(Object.keys(statusFilterLabel) as StatusFilter[]).map((option) => (
              <option key={option} value={option}>
                {statusFilterLabel[option]}
                {report ? ` (${statusCounts[option]})` : ""}
              </option>
            ))}
          </select>
        </div>
        {isMobile && (
          <div className="grid gap-1">
            <Label htmlFor="ads-sort" className="text-xs">
              Ordenar por
            </Label>
            <div className="flex gap-1">
              <select
                id="ads-sort"
                value={sortKey ?? ""}
                onChange={(event) => {
                  const key = (event.target.value || null) as SortKey | null;
                  setSortKey(key);
                  if (key) setSortDirection(defaultDirection(key));
                }}
                className={cn(crmSelectClassName, "h-8 w-44")}
              >
                <option value="">Padrão</option>
                {(Object.keys(sortLabel) as SortKey[]).map((option) => (
                  <option key={option} value={option}>
                    {sortLabel[option]}
                  </option>
                ))}
              </select>
              {sortKey && (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  aria-label={sortDirection === "asc" ? "Crescente; inverter" : "Decrescente; inverter"}
                  onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
                >
                  {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {reportQuery.isLoading && <LoadingState className="justify-start py-2" />}
      {reportQuery.isError && (
        <ErrorState
          message="Não foi possível carregar os resultados."
          onRetry={() => reportQuery.refetch()}
          isRetrying={reportQuery.isFetching}
        />
      )}

      {report && total && (
        <>
          <div className="bg-primary/5 border-primary/30 flex flex-wrap items-end justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
                Custo por venda
                <MetricHelp term="CPA" />
              </p>
              <p className="text-3xl font-semibold tabular-nums">{formatMoney(total.costPerWonDeal, currency)}</p>
              <p className="text-muted-foreground text-xs">
                {total.wonDeals
                  ? `${formatMoney(total.spend, currency)} gastos ÷ ${formatCount(total.wonDeals)} venda(s) ganha(s) no CRM`
                  : "Nenhuma venda de anúncio ganha no CRM no período"}
              </p>
            </div>
            <p className="text-muted-foreground max-w-md text-xs">
              É a medida principal: as sugestões, o piloto e os testes comparam campanhas, conjuntos e anúncios por ela.{" "}
              {adPlatformLabel[account.platform]} mostra o custo por conversa ({formatMoney(total.costPerConversation, currency)}), que não
              diz quem comprou.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-9">
            <Total label="Gasto" value={formatMoney(total.spend, currency)} />
            <Total
              label="Conversas"
              value={formatCount(total.metaConversations)}
              hint={`${formatCount(total.crmConversations)} chegaram ao WhatsApp`}
            />
            <Total
              label={<HeadWithHelp label="Custo por conversa" term="CPA" />}
              value={formatMoney(total.costPerConversation, currency)}
            />
            <Total label="Leads" value={formatCount(total.metaLeads)} hint={`${formatCount(total.crmLeads)} recebidos no CRM`} />
            <Total
              label="Negócios"
              value={formatCount(total.deals)}
              hint={`${formatCount(total.qualifiedDeals)} qualificados (${qualifiedRate(total)})`}
            />
            <Total
              label="Custo por qualificado"
              value={formatMoney(total.costPerQualifiedDeal, currency)}
              hint={`Gasto ÷ ${formatCount(total.qualifiedDeals)} lead(s) qualificado(s)`}
            />
            <Total
              label="Reuniões"
              value={formatCount(total.meetings)}
              hint={`${formatCount(total.aiMeetings)} pela IA · ${formatCount(total.manualMeetings)} manuais · ${formatMoney(total.costPerMeeting, currency)} cada`}
            />
            <Total
              label="Ganhos"
              value={formatMoney(total.wonValue, currency)}
              hint={`${formatCount(total.wonDeals)} negócio(s) · ${formatMoney(total.costPerWonDeal, currency)} cada`}
            />
            <Total
              label={<HeadWithHelp label="ROAS" term="ROAS" />}
              value={total.roas === null ? "—" : `${formatCount(total.roas, 2)}x`}
              hint="Valor ganho ÷ gasto"
            />
          </div>

          {statusFilter !== "all" && (
            <p className="text-muted-foreground text-xs">
              {`Totais só dos ${statusFilterLabel[statusFilter].toLowerCase()} (${formatCount(rows.length)} de ${formatCount(report.rows.length)}).`}
              {report.days.length > 1 && " O gráfico diário mostra a conta toda."}
            </p>
          )}

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

          {report.rows.length > 0 && rows.length === 0 ? (
            <EmptyState
              title={`Nenhum ${statusFilter === "active" ? "ativo" : "inativo"} com resultados no período`}
              description="Troque o filtro de status para ver os demais."
              action={
                <Button size="sm" variant="outline" onClick={() => setStatusFilter("all")}>
                  Ver todos
                </Button>
              }
            />
          ) : report.rows.length === 0 ? (
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
              {sortedRows.map((row) => (
                <ResultCard key={row.id} row={row} currency={currency} />
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sortableHead("name", reportLevelLabel[level].slice(0, -1), { className: "min-w-40 text-left sm:min-w-56" })}
                    {sortableHead("spend", "Gasto")}
                    {sortableHead("ctr", "CTR", { help: <MetricHelp term="CTR" /> })}
                    {sortableHead("metaConversations", "Conversas")}
                    {sortableHead("costPerConversation", "Custo/conversa", { help: <MetricHelp term="CPA" /> })}
                    {sortableHead("metaLeads", "Leads")}
                    {sortableHead("deals", "Negócios")}
                    {sortableHead("qualifiedDeals", "Qualificados")}
                    {sortableHead("qualifiedRate", "% qualif.", { title: "Qualificados ÷ negócios" })}
                    {sortableHead("costPerQualifiedDeal", "Custo/qualif.")}
                    {sortableHead("meetings", "Reuniões")}
                    {sortableHead("costPerMeeting", "Custo/reunião")}
                    {sortableHead("wonValue", "Ganhos", { title: "Ordena pelo valor ganho" })}
                    {sortableHead("costPerWonDeal", "Custo/ganho", { help: <MetricHelp term="CPA" /> })}
                    {sortableHead("roas", "ROAS", { help: <MetricHelp term="ROAS" /> })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((row) => {
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
                        <TableCell className="text-right tabular-nums">{qualifiedRate(row)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.costPerQualifiedDeal, currency)}</TableCell>
                        <TableCell
                          className="text-right tabular-nums"
                          title={`${row.aiMeetings} agendada(s) pela IA · ${row.manualMeetings} manual(is)`}
                        >
                          {formatCount(row.meetings)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.costPerMeeting, currency)}</TableCell>
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
            Conversas e leads são contados {account.platform === "META" ? "pela Meta" : `pelo ${adPlatformLabel[account.platform]}`}.
            Negócios, qualificados e ganhos vêm do CRM: negócios criados no período a partir de um anúncio, e qualificados são os que
            entraram numa etapa com o evento QualifiedLead ou passaram do corte de nota da IA. Reuniões são as agendadas pela IA no Google
            Agenda e os negócios que entraram numa etapa marcada como reunião no funil, sem contar canceladas.
          </p>
          <AdsSignalReadiness account={account} />
          <AdsAttendanceInsights account={account} startDate={startDate} endDate={endDate} />
        </>
      )}
    </section>
  );
};
