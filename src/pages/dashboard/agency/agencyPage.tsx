import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { agencyService } from "@/services/api/agencyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Compass, Loader2, MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import { useState, type FC } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  formatDay,
  formatIndicator,
  formatMetricValue,
  frontInfo,
  frontOrder,
  headlineKeys,
  indicatorChange,
  metricLabel,
  objectiveKindLabel,
  objectiveMix,
  objectiveStatusLabel,
  reportPeriodLabel,
} from "./agencyUtils";
import { FrontReportSheet } from "./frontReportSheet";
import { ObjectiveDialog } from "./objectiveDialog";
import { LastWeekOutcome, MaestroWeekCard, WatchAlerts } from "./maestroSection";
import { MarketingReportButton } from "@/pages/report/marketingReportDialog";

/**
 * Agência: o objetivo da empresa com o ritmo da meta e as três frentes (tráfego pago, orgânico, WhatsApp e relacionamento),
 * cada uma com o relatório semanal da sua IA gestora. É a base que o maestro lê para montar a estratégia central.
 */
export const AgencyPage = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canManage = can("agency.manage");
  const [editing, setEditing] = useState<BusinessObjective | "new" | null>(null);
  const [openFront, setOpenFront] = useState<AgencyFront | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["agency", client.id, "overview"],
    queryFn: () => agencyService.findOverview(client.id),
    refetchInterval: (query) => (query.state.data?.reports.some((report) => report.status === "GENERATING") ? 4000 : false),
  });
  const overview = overviewQuery.data;

  const maestroQuery = useQuery({
    queryKey: ["agency", client.id, "maestro"],
    queryFn: () => agencyService.findMaestro(client.id),
    refetchInterval: (query) => (query.state.data?.cycle?.status === "GENERATING" ? 5000 : false),
  });
  const maestro = maestroQuery.data;

  const requestMaestro = useMutation({
    mutationFn: () => agencyService.requestMaestro(client.id),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", client.id, "maestro"] });
      toast.success("O maestro está montando a semana. A pauta fica com você para aprovar.");
    },
  });

  const requestReports = useMutation({
    mutationFn: () => agencyService.requestReports(client.id),
    onError: requestErrorHandling,
    onSuccess: (reports) => {
      queryClient.invalidateQueries({ queryKey: ["agency", client.id] });
      toast.success(`${reports.length} relatório(s) sendo gerado(s). Leva alguns minutos.`);
    },
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ObjectiveStatus }) => agencyService.setObjectiveStatus(client.id, id, status),
    onError: requestErrorHandling,
    onSuccess: (objective) => {
      queryClient.invalidateQueries({ queryKey: ["agency", client.id] });
      toast.success(`Objetivo ${objectiveStatusLabel[objective.status].toLowerCase()}`);
    },
  });

  const objectives = overview?.objectives ?? [];
  const active = objectives.filter((objective) => objective.status === "ACTIVE");
  const primary = active.find((objective) => objective.priority === "PRIMARY");
  const secondaries = active.filter((objective) => objective.priority === "SECONDARY");
  const others = objectives.filter((objective) => objective.status !== "ACTIVE");
  const mix = objectiveMix(objectives);
  const isGenerating = overview?.reports.some((report) => report.status === "GENERATING");

  const objectiveActions = (objective: BusinessObjective) =>
    canManage ? (
      <ObjectiveMenu
        objective={objective}
        busy={setStatus.isPending}
        onEdit={() => setEditing(objective)}
        onStatus={(status) => setStatus.mutate({ id: objective.id, status })}
      />
    ) : null;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto w-full max-w-5xl space-y-8 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl space-y-1">
            <h1 className="text-2xl font-semibold">Agência</h1>
            <p className="text-muted-foreground text-sm">
              Defina o que a empresa quer agora e acompanhe as três frentes. Toda segunda de manhã, a IA gestora de cada frente fecha o
              relatório da semana com números, alertas e diagnóstico: é o que o maestro usa para montar a estratégia central.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MarketingReportButton />
            {canManage && (
              <>
                <Button variant="outline" onClick={() => requestReports.mutate()} disabled={requestReports.isPending || isGenerating}>
                  {requestReports.isPending || isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Gerar relatórios agora
                </Button>
                <Button onClick={() => setEditing("new")}>
                  <Plus className="h-4 w-4" />
                  Novo objetivo
                </Button>
              </>
            )}
          </div>
        </div>

        {overviewQuery.isLoading ? (
          <LoadingState />
        ) : overviewQuery.isError || !overview ? (
          <ErrorState message="Não foi possível carregar a agência" onRetry={() => overviewQuery.refetch()} />
        ) : (
          <>
            {!overview.aiIncluded && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />O plano não inclui IA: os relatórios trazem só os números e os alertas,
                sem o diagnóstico das gestoras.
              </p>
            )}

            <WatchAlerts alerts={maestro?.alerts ?? []} />

            <section className="space-y-3" aria-labelledby="agency-objective">
              <h2 id="agency-objective" className="text-lg font-semibold">
                Objetivo da empresa
              </h2>
              {primary ? (
                <ObjectiveCard objective={primary} featured mix={mix.get(primary.id)} actions={objectiveActions(primary)} />
              ) : (
                <EmptyState
                  icon={Compass}
                  title="Nenhum objetivo principal ativo"
                  description="Conte o que a empresa quer agora: vender uma oferta, fortalecer a marca, reativar clientes ou lançar algo. As gestoras passam a avaliar a semana contra esse objetivo."
                  action={
                    canManage && (
                      <Button onClick={() => setEditing("new")}>
                        <Plus className="h-4 w-4" />
                        Definir objetivo
                      </Button>
                    )
                  }
                />
              )}
              {secondaries.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {secondaries.map((objective) => (
                    <ObjectiveCard
                      key={objective.id}
                      objective={objective}
                      mix={mix.get(objective.id)}
                      actions={objectiveActions(objective)}
                    />
                  ))}
                </div>
              )}
            </section>

            <MaestroWeekCard
              cycle={maestro?.cycle ?? null}
              canManage={canManage && overview.aiIncluded}
              isRequesting={requestMaestro.isPending}
              onRun={() => requestMaestro.mutate()}
            />
            <LastWeekOutcome week={maestro?.history.find((week) => week.outcome)} />

            <section className="space-y-3" aria-labelledby="agency-fronts">
              <h2 id="agency-fronts" className="text-lg font-semibold">
                Frentes
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                {frontOrder.map((front) => (
                  <FrontCard
                    key={front}
                    front={front}
                    enabled={overview.fronts.includes(front)}
                    report={overview.reports.find((report) => report.front === front)}
                    plan={maestro?.cycle?.status === "READY" ? maestro.cycle.fronts.find((item) => item.front === front) : undefined}
                    onOpen={() => setOpenFront(front)}
                  />
                ))}
              </div>
            </section>

            {others.length > 0 && (
              <section className="space-y-2" aria-labelledby="agency-other-objectives">
                <h2 id="agency-other-objectives" className="text-muted-foreground text-sm font-medium">
                  Objetivos pausados e encerrados
                </h2>
                <ul className="divide-y rounded-lg border">
                  {others.map((objective) => (
                    <li key={objective.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{objective.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {objectiveStatusLabel[objective.status]} · {objectiveKindLabel[objective.kind]}
                        </p>
                      </div>
                      {objectiveActions(objective)}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {editing && overview && (
        <ObjectiveDialog
          objective={editing === "new" ? undefined : editing}
          fronts={overview.fronts}
          hasActivePrimary={!!primary && (editing === "new" || editing.id !== primary.id)}
          onClose={() => setEditing(null)}
        />
      )}
      {openFront && <FrontReportSheet front={openFront} onClose={() => setOpenFront(null)} />}
    </div>
  );
};

const ObjectiveMenu: FC<{
  objective: BusinessObjective;
  busy: boolean;
  onEdit: () => void;
  onStatus: (status: ObjectiveStatus) => void;
}> = ({ objective, busy, onEdit, onStatus }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label={`Ações do objetivo ${objective.title}`} disabled={busy}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
      {objective.status === "ACTIVE" ? (
        <>
          <DropdownMenuItem onSelect={() => onStatus("PAUSED")}>Pausar</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onStatus("DONE")}>Marcar como concluído</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onStatus("CANCELLED")}>Cancelar objetivo</DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem onSelect={() => onStatus("ACTIVE")}>Reativar</DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

const ObjectiveCard: FC<{ objective: BusinessObjective; featured?: boolean; mix?: number; actions: React.ReactNode }> = ({
  objective,
  featured,
  mix,
  actions,
}) => {
  const baseUrl = useBaseUrl();
  const progress = objective.progress;
  return (
    <article className={cn("space-y-3 rounded-xl border p-4", featured && "border-primary/40 bg-primary/5 p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={featured ? "default" : "secondary"}>{featured ? "Principal" : "Secundário"}</Badge>
            <span className="text-muted-foreground text-xs">
              {objectiveKindLabel[objective.kind]}
              {mix !== undefined && mix < 100 && ` · ~${mix}% da pauta`}
            </span>
          </div>
          <h3 className={cn("font-semibold text-balance", featured ? "text-lg" : "text-base")}>{objective.title}</h3>
          <p className="text-muted-foreground text-xs">
            {objective.offerName && (
              <>
                Oferta{" "}
                <Link to={`${baseUrl}/offers`} className="underline-offset-2 hover:underline">
                  {objective.offerName}
                </Link>{" "}
                ·{" "}
              </>
            )}
            {objective.strategyId && objective.strategyName && (
              <>
                Estratégia central{" "}
                <Link to={`${baseUrl}/strategies/${objective.strategyId}`} className="underline-offset-2 hover:underline">
                  {objective.strategyName}
                </Link>{" "}
                ·{" "}
              </>
            )}
            desde {formatDay(objective.startsOn)}
            {objective.deadline && ` até ${formatDay(objective.deadline)}`}
            {objective.fronts.length > 0 && ` · ${objective.fronts.map((front) => frontInfo[front].label).join(", ")}`}
          </p>
        </div>
        {actions}
      </div>

      {progress ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span>
              <span className="text-xl font-semibold tabular-nums">{formatMetricValue(objective.metric, progress.value)}</span>
              {progress.target !== null && (
                <span className="text-muted-foreground"> de {formatMetricValue(objective.metric, progress.target)}</span>
              )}{" "}
              <span className="text-muted-foreground">{metricLabel[objective.metric].toLowerCase()}</span>
            </span>
            <PaceBadge objective={objective} />
          </div>
          {progress.percent !== null && <Progress value={Math.min(progress.percent, 100)} aria-label={`${progress.percent}% da meta`} />}
          {progress.expected !== null && (
            <p className="text-muted-foreground text-xs">
              Pelo prazo, já deveria estar em {formatMetricValue(objective.metric, progress.expected)}
              {progress.daysLeft !== null && ` · faltam ${progress.daysLeft} dia(s)`}
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Não foi possível medir o andamento agora.</p>
      )}
    </article>
  );
};

const PaceBadge: FC<{ objective: BusinessObjective }> = ({ objective }) => {
  const progress = objective.progress;
  if (!progress) return null;
  if (progress.percent !== null && progress.percent >= 100) return <Badge className="bg-emerald-600 text-white">Meta batida</Badge>;
  if (progress.onTrack === true) return <Badge className="bg-emerald-600 text-white">No ritmo</Badge>;
  if (progress.onTrack === false) return <Badge variant="destructive">Abaixo do ritmo</Badge>;
  return null;
};

const FrontCard: FC<{
  front: AgencyFront;
  enabled: boolean;
  report: FrontReport | undefined;
  // Diretrizes do maestro para a frente nesta semana
  plan?: MaestroFrontPlan;
  onOpen: () => void;
}> = ({ front, enabled, report, plan, onOpen }) => {
  const info = frontInfo[front];
  const headline = report?.status === "READY" ? headlineKeys[front].map((key) => report.indicators.find((item) => item.key === key)) : [];
  const critical = report?.alerts.filter((alert) => alert.level === "CRITICAL").length ?? 0;
  const warnings = report?.alerts.filter((alert) => alert.level === "WARNING").length ?? 0;

  return (
    <article className={cn("flex flex-col gap-3 rounded-xl border p-4", !enabled && "bg-muted/30")}>
      <div className="flex items-center gap-2">
        <info.icon className="h-5 w-5 shrink-0" />
        <h3 className="font-semibold">{info.label}</h3>
      </div>

      {!enabled ? (
        <p className="text-muted-foreground text-sm">
          {front === "PAID"
            ? "Sem conta de anúncio ligada ou fora do plano. Ligue uma conta em Configurações para esta gestora entrar em ação."
            : "Fora do plano. Fale com o seu implantador para incluir redes sociais."}
        </p>
      ) : !report ? (
        <p className="text-muted-foreground text-sm">Ainda sem relatório. O primeiro sai na próxima segunda, ou gere agora.</p>
      ) : report.status === "GENERATING" ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Fechando o relatório da semana...
        </p>
      ) : report.status === "FAILED" ? (
        <p className="text-destructive text-sm">O último relatório falhou. Gere de novo.</p>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">{reportPeriodLabel(report)}</p>
          <dl className="space-y-1.5">
            {headline.map(
              (indicator) =>
                indicator && (
                  <div key={indicator.key} className="flex items-baseline justify-between gap-2 text-sm">
                    <dt className="text-muted-foreground">{indicator.label}</dt>
                    <dd className="font-medium tabular-nums">
                      {formatIndicator(indicator, indicator.value)}
                      <ChangeMark indicator={indicator} />
                    </dd>
                  </div>
                ),
            )}
          </dl>
          {(critical > 0 || warnings > 0) && (
            <p
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                critical ? "text-destructive" : "text-amber-700 dark:text-amber-400",
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {critical > 0 && `${critical} crítico(s)`}
              {critical > 0 && warnings > 0 && " · "}
              {warnings > 0 && `${warnings} alerta(s)`}
            </p>
          )}
          {report.diagnosis && <p className="text-muted-foreground line-clamp-3 text-sm">{report.diagnosis}</p>}
        </>
      )}

      {plan && (
        <div className="space-y-1 border-t pt-3">
          <p className="text-xs font-semibold">Diretriz da semana</p>
          {plan.focus && <p className="text-sm">{plan.focus}</p>}
          <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
            {plan.directives.map((directive) => (
              <li key={directive.title} title={directive.why}>
                {directive.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {enabled && report && (
        <Button variant="outline" size="sm" className="mt-auto self-start" onClick={onOpen}>
          Ver relatório
        </Button>
      )}
    </article>
  );
};

const ChangeMark: FC<{ indicator: FrontIndicator }> = ({ indicator }) => {
  const change = indicatorChange(indicator);
  if (!change) return null;
  return (
    <span
      className={cn(
        "ml-1 text-xs",
        change.tone === "good" && "text-emerald-700 dark:text-emerald-400",
        change.tone === "bad" && "text-destructive",
        change.tone === "neutral" && "text-muted-foreground",
      )}
    >
      {change.percent > 0 ? "▲" : change.percent < 0 ? "▼" : ""}
      {Math.abs(change.percent)}%
    </span>
  );
};
