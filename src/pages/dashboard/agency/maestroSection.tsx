import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, Loader2, MessageCircleQuestionMark, Music2 } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";
import { alertTone, formatDay, frontInfo } from "./agencyUtils";

// Situação da pauta em palavras de quem aprova
const agendaStatusLabel: Record<string, string> = {
  AWAITING_APPROVAL: "Esperando aprovação",
  QUEUED: "Aprovada, na fila",
  RUNNING: "Sendo executada",
  DONE: "Executada",
  PARTIAL: "Executada em parte",
  FAILED: "Falhou",
  REJECTED: "Recusada",
  EXPIRED: "Vencida",
};

const askMaestro =
  "Por que o maestro montou esta estratégia da semana? Explique a decisão de cada frente com os números (use agencia_ler).";

/** Alertas do vigia diário: só avisam e apontam onde resolver. */
export const WatchAlerts: FC<{ alerts: AgencyAlert[] }> = ({ alerts }) => {
  if (!alerts.length) return null;
  return (
    <section aria-labelledby="agency-watch" className="space-y-2">
      <h2 id="agency-watch" className="text-sm font-semibold">
        Vigia do maestro · {formatDay(alerts[0].day)}
      </h2>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id} className={cn("flex flex-wrap items-start gap-2 rounded-lg border p-3 text-sm", alertTone[alert.level])}>
            {alert.level === "INFO" ? <Info className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="min-w-0 flex-1">
              <span className="font-medium">{alert.title}.</span> {alert.detail}
            </span>
            {alert.path && (
              <Link to={alert.path} className="shrink-0 font-medium underline underline-offset-2">
                Resolver
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

const verdictLabel: Record<MaestroOutcome["fronts"][number]["verdict"], string> = {
  IMPROVED: "melhorou",
  WORSE: "piorou",
  STABLE: "ficou estável",
  NO_DATA: "sem relatório",
};

/** O que aconteceu na última semana avaliada: o maestro lê isso antes de montar a próxima. */
export const LastWeekOutcome: FC<{ week: MaestroSummary["history"][number] | undefined }> = ({ week }) => {
  if (!week?.outcome) return null;
  return (
    <div className="bg-muted/40 space-y-1 rounded-lg p-3 text-sm">
      <p className="font-medium">
        Resultado da semana de {formatDay(week.weekStart)}
        {week.centralMessage && <span className="text-muted-foreground font-normal"> · "{week.centralMessage}"</span>}
      </p>
      <ul className="space-y-0.5">
        {week.outcome.fronts.map((front) => (
          <li key={front.front}>
            <span
              className={cn(
                front.verdict === "IMPROVED" && "text-emerald-700 dark:text-emerald-400",
                front.verdict === "WORSE" && "text-destructive",
              )}
            >
              {frontInfo[front.front].label} {verdictLabel[front.verdict]}
            </span>
            {front.changes.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                ({front.changes.map((change) => `${change.label} ${change.percent > 0 ? "+" : ""}${change.percent}%`).join(", ")})
              </span>
            )}
          </li>
        ))}
      </ul>
      {week.outcome.agenda && (
        <p className="text-muted-foreground text-xs">
          Pauta: {week.outcome.agenda.done} de {week.outcome.agenda.steps} item(ns) feitos
          {week.outcome.objectiveDelta !== null && ` · objetivo avançou ${week.outcome.objectiveDelta}`}
        </p>
      )}
    </div>
  );
};

type Props = {
  cycle: MaestroCycle | null;
  canManage: boolean;
  isRequesting: boolean;
  onRun: () => void;
};

/** Semana do maestro: estratégia da semana, metas e a pauta montada para aprovação. */
export const MaestroWeekCard: FC<Props> = ({ cycle, canManage, isRequesting, onRun }) => {
  const baseUrl = useBaseUrl();
  const busy = isRequesting || cycle?.status === "GENERATING";

  const runButton = canManage && (
    <Button variant="outline" size="sm" onClick={onRun} disabled={busy}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {cycle ? "Refazer a semana" : "Rodar o maestro agora"}
    </Button>
  );

  return (
    <section aria-labelledby="agency-maestro" className="space-y-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="agency-maestro" className="flex items-center gap-2 text-lg font-semibold">
            <Music2 className="h-5 w-5" />
            Maestro
            {cycle && <span className="text-muted-foreground text-sm font-normal">· semana de {formatDay(cycle.weekStart)}</span>}
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Toda segunda às 6h, o maestro lê o objetivo, a estratégia central e o relatório de cada frente, monta a estratégia da semana e
            entrega a pauta para aprovação. Nada vai ao ar sem alguém aprovar, e verba sempre tem aprovação própria.
          </p>
        </div>
        {runButton}
      </div>

      {!cycle ? (
        <p className="text-muted-foreground text-sm">A primeira semana sai na próxima segunda, ou rode o maestro agora.</p>
      ) : cycle.status === "GENERATING" ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />O maestro está lendo as frentes e montando a pauta. Leva alguns minutos.
        </p>
      ) : cycle.status === "SKIPPED" ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
          Sem pauta nesta semana: {cycle.skippedReason}
        </p>
      ) : cycle.status === "FAILED" ? (
        <p role="alert" className="text-destructive text-sm">
          A semana falhou: {cycle.error ?? "erro desconhecido"}. Tente rodar de novo.
        </p>
      ) : (
        <div className="space-y-4">
          {cycle.centralMessage && (
            <blockquote className="border-primary bg-primary/5 rounded-r-lg border-l-4 px-4 py-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Mensagem central da semana</p>
              <p className="text-base font-semibold text-balance">{cycle.centralMessage}</p>
            </blockquote>
          )}
          {cycle.diagnosis && <p className="text-sm whitespace-pre-line">{cycle.diagnosis}</p>}
          {cycle.weekGoals.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Metas da semana</h3>
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {cycle.weekGoals.map((goal) => (
                  <li key={goal.title}>
                    {goal.title}
                    {goal.target && <span className="text-muted-foreground"> · alvo {goal.target}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            {cycle.planId && cycle.agenda ? (
              <>
                <Badge variant={cycle.agenda.status === "AWAITING_APPROVAL" ? "default" : "secondary"}>
                  Pauta: {agendaStatusLabel[cycle.agenda.status] ?? cycle.agenda.status}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  {cycle.agenda.done} de {cycle.agenda.steps} item(ns) feitos
                </span>
                <Button size="sm" asChild>
                  <Link to={`${baseUrl}/assistant?plan=${cycle.planId}`}>
                    {cycle.agenda.status === "AWAITING_APPROVAL" ? "Ver e aprovar a pauta" : "Ver a pauta"}
                  </Link>
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">
                O maestro não montou itens para esta semana{cycle.agendaSummary ? `: ${cycle.agendaSummary.substring(0, 300)}` : "."}
              </span>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link to={`${baseUrl}/assistant?mensagem=${encodeURIComponent(askMaestro)}`}>
                <MessageCircleQuestionMark className="h-4 w-4" />
                Perguntar ao maestro
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
