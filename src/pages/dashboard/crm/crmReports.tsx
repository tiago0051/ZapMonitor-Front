import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { crmService } from "@/services/api/crmService";
import { useQuery } from "@tanstack/react-query";
import { endOfDay, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { BarChart3 } from "lucide-react";
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

const StatTile: FC<{ label: string; value: string; detail?: string }> = ({ label, value, detail }) => (
  <div className="bg-card rounded-xl border p-4">
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    {detail && <p className="text-muted-foreground text-sm tabular-nums">{detail}</p>}
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
            <StatTile label="Criados" value={String(report.created)} detail="negócios novos no período" />
            <StatTile label="Ganhos" value={String(report.won.count)} detail={formatCurrency(report.won.value)} />
            <StatTile label="Perdidos" value={String(report.lost.count)} detail={formatCurrency(report.lost.value)} />
            <StatTile
              label="Taxa de ganho"
              value={report.winRate === null ? "—" : percent(report.winRate)}
              detail="dos encerrados no período"
            />
          </div>

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
