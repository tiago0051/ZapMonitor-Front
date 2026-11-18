import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { crmService } from "@/services/api/crmService";
import { useQuery } from "@tanstack/react-query";
import { endOfDay, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { useState, type FC } from "react";
import { useLocalStorage } from "usehooks-ts";
import { crmSelectClassName, formatCurrency } from "./crmUtils";
import { useCrmOptions } from "./useCrmOptions";

type PeriodPreset = "month" | "30" | "90" | "custom";

const periodLabel: Record<PeriodPreset, string> = {
  month: "Este mês",
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
  custom: "Personalizado",
};

const toDateInput = (date: Date) => format(date, "yyyy-MM-dd");
const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

const formatDuration = (hours: number | null) => {
  if (hours === null) return "—";
  if (hours < 1) return "menos de 1 hora";
  if (hours < 48) return `${Math.round(hours)} h`;

  return `${(hours / 24).toFixed(1).replace(".", ",")} dias`;
};

// Variação contra o período anterior; "melhor" diz se subir é bom (perdas: subir é ruim)
type Change = { current: number; previous: number; higherIsBetter?: boolean; isRate?: boolean };

const ChangeLabel: FC<Change> = ({ current, previous, higherIsBetter = true, isRate }) => {
  if (current === previous) return <span className="text-muted-foreground">igual ao período anterior</span>;
  // Taxa compara em pontos percentuais; contagens, em % do anterior
  const text = isRate
    ? `${current > previous ? "+" : "−"}${Math.abs(Math.round((current - previous) * 100))} p.p.`
    : previous === 0
      ? "novo no período"
      : `${current > previous ? "+" : "−"}${Math.abs(Math.round(((current - previous) / previous) * 100))}%`;
  const isGood = current > previous === higherIsBetter;

  return (
    <span className={cn("font-medium", isGood ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
      {current > previous ? <TrendingUp className="mr-0.5 inline h-3.5 w-3.5" /> : <TrendingDown className="mr-0.5 inline h-3.5 w-3.5" />}
      {text} <span className="text-muted-foreground font-normal">vs. anterior</span>
    </span>
  );
};

const StatTile: FC<{ label: string; value: string; detail?: string; change?: Change }> = ({ label, value, detail, change }) => (
  <div className="bg-card rounded-xl border p-4">
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    {detail && <p className="text-muted-foreground text-sm tabular-nums">{detail}</p>}
    {change && (
      <p className="mt-1 text-xs tabular-nums">
        <ChangeLabel {...change} />
      </p>
    )}
  </div>
);

// Barra horizontal de uma série só: a largura é a fração e o rótulo traz o número, para não depender da cor
const BarRow: FC<{ label: string; fraction: number; valueLabel: string; color?: string }> = ({ label, fraction, valueLabel, color }) => (
  <div
    className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto]"
    title={`${label}: ${valueLabel}`}
  >
    <span className="flex min-w-0 items-center gap-1.5">
      {color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      <span className="truncate">{label}</span>
    </span>
    <div className="bg-muted h-3 overflow-hidden rounded">
      <div className="bg-primary h-full rounded-r" style={{ width: `${Math.max(fraction * 100, fraction > 0 ? 2 : 0)}%` }} />
    </div>
    <span className="text-muted-foreground text-right text-xs whitespace-nowrap tabular-nums">{valueLabel}</span>
  </div>
);

/** Funil do período nos negócios que o usuário pode ver: conversão, tempo por etapa, ganhos e motivos de perda. */
export const CrmReports = () => {
  const { client } = useClientContext();
  const { activePipelines, visibleServiceGroups } = useCrmOptions();

  const [storedPipelineId, setStoredPipelineId] = useLocalStorage<string | null>(`crm:pipeline:${client.id}`, null);
  const [storedServiceGroupIds] = useLocalStorage<string[]>(`crm:serviceGroups:${client.id}`, []);
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [customStart, setCustomStart] = useState(() => toDateInput(startOfMonth(new Date())));
  const [customEnd, setCustomEnd] = useState(() => toDateInput(new Date()));

  const pipeline = activePipelines.find((item) => item.id === storedPipelineId) ?? activePipelines[0];
  const selectedServiceGroupIds = storedServiceGroupIds.filter((id) => visibleServiceGroups.some((group) => group.id === id));

  const now = new Date();
  const startDate =
    preset === "month"
      ? startOfMonth(now)
      : preset === "custom"
        ? startOfDay(parseDateInput(customStart))
        : startOfDay(subDays(now, Number(preset)));
  const endDate = preset === "custom" ? endOfDay(parseDateInput(customEnd)) : endOfDay(now);
  const isPeriodValid = !!customStart && !!customEnd && startDate <= endDate;

  const queries = {
    pipelineId: pipeline?.id ?? "",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    serviceGroupIds: selectedServiceGroupIds.length ? selectedServiceGroupIds.join(",") : undefined,
  };

  const reportQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["crm", "deals", "report", client.id, queries],
    queryFn: () => crmService.findReport({ params: { clientId: client.id }, queries }),
    enabled: !!pipeline && isPeriodValid,
  });

  if (!pipeline)
    return <EmptyState icon={BarChart3} title="Nenhum funil ativo" description="Os relatórios aparecem quando houver um funil ativo." />;

  const report = reportQuery.data;
  const stagesById = new Map(pipeline.stages.map((stage) => [stage.id, stage]));
  const funnelStages = report?.stages.filter((item) => stagesById.get(item.stageId)?.type !== "LOST") ?? [];
  const maxReasonCount = Math.max(...(report?.lostReasons.map((item) => item.count) ?? [0]), 1);

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor="report-pipeline" className="text-xs">
            Funil
          </Label>
          <select
            id="report-pipeline"
            value={pipeline.id}
            onChange={(event) => setStoredPipelineId(event.target.value)}
            className={cn(crmSelectClassName, "w-48")}
          >
            {activePipelines.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="report-period" className="text-xs">
            Período
          </Label>
          <select
            id="report-period"
            value={preset}
            onChange={(event) => setPreset(event.target.value as PeriodPreset)}
            className={cn(crmSelectClassName, "w-44")}
          >
            {(Object.keys(periodLabel) as PeriodPreset[]).map((option) => (
              <option key={option} value={option}>
                {periodLabel[option]}
              </option>
            ))}
          </select>
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-1">
            <Input
              type="date"
              aria-label="Início do período"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              className="w-36"
            />
            <Input
              type="date"
              aria-label="Fim do período"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              className="w-36"
            />
          </div>
        )}
        <p className="text-muted-foreground pb-2 text-xs">
          {selectedServiceGroupIds.length > 0 ? "Usando os grupos escolhidos no quadro." : "Todos os negócios que você pode ver."}
        </p>
      </div>

      {!isPeriodValid && <p className="text-destructive text-sm">O início do período deve ser antes do fim.</p>}
      {reportQuery.isLoading && <LoadingState />}
      {reportQuery.isError && (
        <ErrorState
          message="Não foi possível carregar o relatório."
          onRetry={() => reportQuery.refetch()}
          isRetrying={reportQuery.isFetching}
        />
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Em aberto"
              value={formatCurrency(report.forecast.openValue)}
              detail={`${report.forecast.openCount} ${report.forecast.openCount === 1 ? "negócio aberto" : "negócios abertos"} agora`}
            />
            <StatTile
              label="Previsão"
              value={formatCurrency(report.forecast.forecastValue)}
              detail={
                report.forecast.withoutProbability > 0
                  ? `${report.forecast.withoutProbability} com valor ficaram fora (sem nota da IA nem chance na etapa)`
                  : "valor × chance de ganho"
              }
            />
          </div>
          <p className="text-muted-foreground -mt-3 text-xs">
            Em aberto e previsão olham os negócios abertos agora, sem depender do período. A previsão soma o valor de cada negócio vezes a
            chance de ganho: a nota da IA do negócio, quando existe; senão, a chance cadastrada na etapa (configuração do funil).
          </p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Criados"
              value={String(report.created)}
              detail="negócios novos no período"
              change={{ current: report.created, previous: report.previous.created }}
            />
            <StatTile
              label="Ganhos"
              value={String(report.won.count)}
              detail={formatCurrency(report.won.value)}
              change={{ current: report.won.count, previous: report.previous.won.count }}
            />
            <StatTile
              label="Perdidos"
              value={String(report.lost.count)}
              detail={formatCurrency(report.lost.value)}
              change={{ current: report.lost.count, previous: report.previous.lost.count, higherIsBetter: false }}
            />
            <StatTile
              label="Taxa de ganho"
              value={report.winRate === null ? "—" : percent(report.winRate)}
              detail="dos encerrados no período"
              change={
                report.winRate !== null && report.previous.winRate !== null
                  ? { current: report.winRate, previous: report.previous.winRate, isRate: true }
                  : undefined
              }
            />
          </div>
          <p className="text-muted-foreground -mt-3 text-xs">
            Comparado com {format(new Date(report.previous.startDate), "dd/MM")} a {format(new Date(report.previous.endDate), "dd/MM/yyyy")}
            , período anterior de mesmo tamanho.
          </p>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">Por vendedor</h2>
              <p className="text-muted-foreground text-sm">
                Pelo responsável de cada negócio. Ganhos, perdidos e valor contam os encerrados no período.
              </p>
            </div>
            {report.owners.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum negócio no período.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="text-right">Negócios</TableHead>
                      <TableHead className="text-right">Ganhos</TableHead>
                      <TableHead className="text-right">Valor ganho</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.owners.map((owner) => (
                      <TableRow key={owner.ownerUserId ?? "none"}>
                        <TableCell className={cn(!owner.ownerUserId && "text-muted-foreground")}>
                          {owner.ownerName ?? "Sem responsável"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{owner.created}</TableCell>
                        <TableCell className="text-right tabular-nums">{owner.won}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(owner.wonValue)}</TableCell>
                        <TableCell className="text-right tabular-nums">{owner.winRate === null ? "—" : percent(owner.winRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">Conversão por etapa</h2>
              <p className="text-muted-foreground text-sm">
                Dos {report.created} negócios criados no período, quantos passaram por cada etapa.
              </p>
            </div>
            {report.created === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum negócio criado no período.</p>
            ) : (
              <div className="space-y-2">
                {funnelStages.map((item) => {
                  const stage = stagesById.get(item.stageId);
                  return (
                    <BarRow
                      key={item.stageId}
                      label={stage?.name ?? "Etapa removida"}
                      color={stage?.color}
                      fraction={item.conversion}
                      valueLabel={`${item.reached} · ${percent(item.conversion)}`}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">Tempo médio por etapa</h2>
              <p className="text-muted-foreground text-sm">
                Da entrada na etapa até a próxima mudança; negócios ainda abertos contam o tempo até agora.
              </p>
            </div>
            <div className="max-w-xl rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-right">Tempo médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.stages
                    .filter((item) => stagesById.get(item.stageId)?.type === "OPEN")
                    .map((item) => (
                      <TableRow key={item.stageId}>
                        <TableCell>{stagesById.get(item.stageId)?.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatDuration(item.averageHours)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">Motivos de perda</h2>
              <p className="text-muted-foreground text-sm">Dos {report.lost.count} negócios perdidos no período.</p>
            </div>
            {report.lostReasons.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma perda no período.</p>
            ) : (
              <div className="space-y-2">
                {report.lostReasons.map((item) => (
                  <BarRow key={item.reason} label={item.reason} fraction={item.count / maxReasonCount} valueLabel={String(item.count)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
