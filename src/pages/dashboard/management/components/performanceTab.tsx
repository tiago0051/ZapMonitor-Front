import { ErrorState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn, formatNumber, formatPercentage } from "@/lib/utils";
import { reportService } from "@/services/api/reportService";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfWeek } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Bot, Clock, Headset, MessageSquareReply, MessagesSquare, UserCheck } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { thisMonthPeriod, toPeriodQuery, type Period } from "./period";
import { PeriodFilter } from "./periodFilter";

// Acima disso a série diária fica ilegível: agrupa por semana
const MAX_DAILY_POINTS = 62;

const SERIES = {
  received: { label: "Recebidas", color: "var(--viz-1)" },
  sentByAttendants: { label: "Enviadas por atendentes", color: "var(--viz-2)" },
  sentAutomated: { label: "Automáticas", color: "var(--viz-3)" },
  servicesWithAttendant: { label: "Com atendente", color: "var(--viz-2)" },
  servicesAutomationOnly: { label: "Só automação", color: "var(--viz-3)" },
} as const;

const tooltipProps = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
  formatter: (value: unknown) => formatNumber(Number(value)),
};
const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
const legendStyle = { fontSize: 12, color: "var(--muted-foreground)" };

/** Variação percentual; nula quando não há base de comparação. */
const variation = (current: number | null, previous: number | null) => {
  if (current === null || previous === null) return null;
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
};

const share = (part: number, total: number) => (total > 0 ? (part / total) * 100 : null);

const formatDuration = (seconds: number | null) => {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

type ChartPoint = {
  label: string;
  received: number;
  sentByAttendants: number;
  sentAutomated: number;
  servicesWithAttendant: number;
  servicesAutomationOnly: number;
};

const buildSeries = (daily: WhatsappPerformanceDay[]): { points: ChartPoint[]; byWeek: boolean } => {
  const byWeek = daily.length > MAX_DAILY_POINTS;
  const buckets = new Map<string, ChartPoint>();

  for (const day of daily) {
    const date = parseISO(day.date);
    const key = byWeek ? format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd") : day.date;
    const label = byWeek ? `Sem. ${format(parseISO(key), "dd/MM")}` : format(date, "dd/MM");
    const bucket = buckets.get(key) ?? {
      label,
      received: 0,
      sentByAttendants: 0,
      sentAutomated: 0,
      servicesWithAttendant: 0,
      servicesAutomationOnly: 0,
    };
    bucket.received += day.received;
    bucket.sentByAttendants += day.sentByAttendants;
    bucket.sentAutomated += day.sentAutomated;
    bucket.servicesWithAttendant += day.servicesWithAttendant;
    bucket.servicesAutomationOnly += day.services - day.servicesWithAttendant;
    buckets.set(key, bucket);
  }

  return { points: Array.from(buckets.values()), byWeek };
};

const Kpi = ({
  label,
  value,
  icon: Icon,
  change,
  lowerIsBetter,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  change: number | null;
  lowerIsBetter?: boolean;
  hint?: string;
}) => {
  const isGood = change !== null && change !== 0 && (lowerIsBetter ? change < 0 : change > 0);
  const isBad = change !== null && change !== 0 && !isGood;

  return (
    <div className="bg-card rounded-xl border p-4 shadow-xs">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-xs">
        {change === null ? (
          <span className="text-muted-foreground">{hint ?? "Sem base no período anterior"}</span>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex items-center font-medium tabular-nums",
                isGood && "text-emerald-600",
                isBad && "text-red-600",
                !isGood && !isBad && "text-muted-foreground",
              )}
            >
              {change > 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              ) : change < 0 ? (
                <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
              ) : null}
              {formatPercentage(Math.abs(change))}
            </span>
            <span className="text-muted-foreground">{change > 0 ? "a mais" : change < 0 ? "a menos" : "igual"} que o período anterior</span>
          </>
        )}
      </p>
    </div>
  );
};

export const PerformanceTab = () => {
  const { client } = useClientContext();
  const [period, setPeriod] = useState<Period>(thisMonthPeriod);
  const [chartView, setChartView] = useState<"messages" | "services">("messages");

  const periodQuery = toPeriodQuery(period);

  const performanceQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["report", "whatsappPerformance", client.id, periodQuery],
    queryFn: () =>
      reportService.findWhatsappPerformance({
        params: { clientId: client.id },
        queries: { ...periodQuery!, timezoneOffset: new Date().getTimezoneOffset() },
      }),
    enabled: !!periodQuery,
    // Trocar o período mantém o relatório anterior na tela até o novo chegar
    placeholderData: (previousData) => previousData,
  });

  const data = performanceQuery.data;

  return (
    <div className="space-y-4">
      <PeriodFilter period={period} onChange={setPeriod} idPrefix="performance-period" />

      {performanceQuery.isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      )}

      {performanceQuery.isError && (
        <ErrorState
          message="Não foi possível carregar o desempenho do WhatsApp."
          onRetry={() => performanceQuery.refetch()}
          isRetrying={performanceQuery.isFetching}
        />
      )}

      {data && (
        <PerformanceContent data={data} chartView={chartView} onChartViewChange={setChartView} isRefreshing={performanceQuery.isFetching} />
      )}
    </div>
  );
};

const PerformanceContent = ({
  data,
  chartView,
  onChartViewChange,
  isRefreshing,
}: {
  data: WhatsappPerformance;
  chartView: "messages" | "services";
  onChartViewChange: (view: "messages" | "services") => void;
  isRefreshing: boolean;
}) => {
  const { summary, previous } = data;
  const { points, byWeek } = buildSeries(data.daily);

  const attendantShare = share(summary.servicesWithAttendant, summary.services);
  const previousAttendantShare = share(previous.servicesWithAttendant, previous.services);

  const peakHour = data.hourly.reduce((peak, hour) => (hour.received > peak.received ? hour : peak), data.hourly[0]);
  const hasMessages = summary.received + summary.sentByAttendants + summary.sentAutomated > 0;
  const totalAttendantServices = data.attendants.reduce((total, attendant) => total + attendant.services, 0);

  const previousLabel = `${format(parseISO(data.previousPeriod.startDate), "dd/MM")} a ${format(parseISO(data.previousPeriod.endDate), "dd/MM")}`;

  return (
    <div className={cn("space-y-4 transition-opacity", isRefreshing && "opacity-60")} aria-busy={isRefreshing}>
      <p className="text-muted-foreground text-xs">Comparado com o período anterior de mesma duração ({previousLabel}).</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Mensagens recebidas"
          icon={MessagesSquare}
          value={formatNumber(summary.received)}
          change={variation(summary.received, previous.received)}
        />
        <Kpi
          label="Enviadas por atendentes"
          icon={MessageSquareReply}
          value={formatNumber(summary.sentByAttendants)}
          change={variation(summary.sentByAttendants, previous.sentByAttendants)}
        />
        <Kpi
          label="Enviadas automaticamente"
          icon={Bot}
          value={formatNumber(summary.sentAutomated)}
          change={variation(summary.sentAutomated, previous.sentAutomated)}
          hint="Fluxos, agentes de IA e campanhas"
        />
        <Kpi
          label="Atendimentos iniciados"
          icon={Headset}
          value={formatNumber(summary.services)}
          change={variation(summary.services, previous.services)}
        />
        <Kpi
          label="Passaram por atendente"
          icon={UserCheck}
          value={attendantShare === null ? "—" : formatPercentage(attendantShare, 0)}
          change={variation(attendantShare, previousAttendantShare)}
          hint={`${formatNumber(summary.servicesWithAttendant)} de ${formatNumber(summary.services)}`}
        />
        <Kpi
          label="Tempo até o atendente assumir"
          icon={Clock}
          value={formatDuration(summary.avgSecondsToAttendant)}
          change={variation(summary.avgSecondsToAttendant, previous.avgSecondsToAttendant)}
          lowerIsBetter
          hint="Média desde a primeira mensagem"
        />
      </div>

      <div className="bg-card rounded-xl border p-4 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              {chartView === "messages" ? "Mensagens" : "Atendimentos iniciados"} por {byWeek ? "semana" : "dia"}
            </h2>
            <p className="text-muted-foreground text-xs">
              {chartView === "messages"
                ? "Recebidas dos contatos e enviadas pela equipe ou pela automação."
                : "Quantos atendimentos chegaram a um atendente e quantos a automação resolveu sozinha."}
            </p>
          </div>
          <Tabs value={chartView} onValueChange={(value) => onChartViewChange(value as "messages" | "services")}>
            <TabsList>
              <TabsTrigger value="messages">Mensagens</TabsTrigger>
              <TabsTrigger value="services">Atendimentos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {(chartView === "messages" ? hasMessages : summary.services > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={points} barGap={2} margin={{ left: -12, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={12} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipProps} />
              <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
              {chartView === "messages" ? (
                <>
                  <Bar dataKey="received" name={SERIES.received.label} fill={SERIES.received.color} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar
                    dataKey="sentByAttendants"
                    stackId="sent"
                    name={SERIES.sentByAttendants.label}
                    fill={SERIES.sentByAttendants.color}
                    stroke="var(--card)"
                    strokeWidth={1}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="sentAutomated"
                    stackId="sent"
                    name={SERIES.sentAutomated.label}
                    fill={SERIES.sentAutomated.color}
                    stroke="var(--card)"
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                </>
              ) : (
                <>
                  <Bar
                    dataKey="servicesWithAttendant"
                    stackId="services"
                    name={SERIES.servicesWithAttendant.label}
                    fill={SERIES.servicesWithAttendant.color}
                    stroke="var(--card)"
                    strokeWidth={1}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="servicesAutomationOnly"
                    stackId="services"
                    name={SERIES.servicesAutomationOnly.label}
                    fill={SERIES.servicesAutomationOnly.color}
                    stroke="var(--card)"
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground py-16 text-center text-sm">Nenhum movimento no período.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="bg-card rounded-xl border p-4 shadow-xs xl:col-span-2">
          <h2 className="text-base font-semibold">Horários de maior movimento</h2>
          <p className="text-muted-foreground mb-4 text-xs">
            {peakHour && peakHour.received > 0
              ? `Mensagens recebidas por hora. O pico é às ${peakHour.hour}h: vale ter mais gente na escala nesse horário.`
              : "Mensagens recebidas por hora do dia."}
          </p>
          {summary.received > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.hourly} margin={{ left: -12, right: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="hour" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(hour) => `${hour}h`} interval={2} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipProps} labelFormatter={(hour) => `Das ${hour}h às ${Number(hour) + 1}h`} />
                <Bar dataKey="received" name={SERIES.received.label} fill={SERIES.received.color} radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground py-12 text-center text-sm">Nenhuma mensagem recebida no período.</p>
          )}
        </div>

        <div className="bg-card min-w-0 rounded-xl border shadow-xs xl:col-span-3">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">Desempenho por atendente</h2>
              <p className="text-muted-foreground text-xs">Atendimentos assumidos e mensagens enviadas no período.</p>
            </div>
            <Badge variant="outline">{data.attendants.length} pessoa(s)</Badge>
          </div>
          {data.attendants.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">Nenhum atendente teve movimento no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atendente</TableHead>
                  <TableHead className="text-right">Atendimentos</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Mensagens</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Msg. por atendimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.attendants.map((attendant) => {
                  const attendantPart = share(attendant.services, totalAttendantServices) ?? 0;
                  return (
                    <TableRow key={attendant.userId}>
                      <TableCell className="max-w-48">
                        <span className="block truncate font-medium">{attendant.name}</span>
                        {!attendant.active && <span className="text-muted-foreground text-xs">Desativado</span>}
                        <span className="bg-muted mt-1 block h-1.5 w-full overflow-hidden rounded-full" aria-hidden>
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${attendantPart}%`, background: SERIES.servicesWithAttendant.color }}
                          />
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(attendant.services)}
                        <span className="text-muted-foreground block text-xs">{formatPercentage(attendantPart, 0)}</span>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatNumber(attendant.sentMessages)}</TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {attendant.services > 0
                          ? (attendant.sentMessages / attendant.services).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};
