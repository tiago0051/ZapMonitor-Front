import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { crmService } from "@/services/api/crmService";
import { format } from "date-fns";
import { Loader2, Pencil, Target } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { formatMoney, selectClassName } from "./strategyUtils";

type Props = {
  strategy: MarketingStrategy;
  results: StrategyResults | null;
  canManage: boolean;
  onSaved: (strategy: MarketingStrategy) => void;
  // Recalcula os resultados depois de mudar a meta
  onGoalChanged: () => void;
};

const goalText = (goal: StrategySalesGoal, currency: string | null) =>
  goal.kind === "SALES" ? `${goal.value} vendas` : `${formatMoney(goal.value, currency)} vendidos`;

const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : "—");

/** Meta de vendas no prazo do briefing, com o ritmo: o feito contra o tempo que já passou. */
const SalesGoalCard: FC<Props & { currency: string | null }> = ({ strategy, results, canManage, onSaved, onGoalChanged, currency }) => {
  const { client } = useClientContext();
  const goal = strategy.brief.salesGoal ?? null;
  const progress = results?.goal ?? null;
  const [isEditing, setIsEditing] = useState(false);
  const [kind, setKind] = useState<StrategySalesGoal["kind"]>(goal?.kind ?? "SALES");
  const [valueText, setValueText] = useState(goal ? String(goal.value) : "");

  const save = useMutation({
    mutationFn: (salesGoal: StrategySalesGoal | null) => marketingStrategyService.update(client.id, strategy.id, { salesGoal }),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      onSaved(saved);
      onGoalChanged();
      setIsEditing(false);
      toast.success("Meta salva");
    },
  });

  const value = Number(valueText.replace(/\./g, "").replace(",", "."));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Number.isFinite(value) && value > 0) save.mutate({ kind, value });
  };

  if (isEditing)
    return (
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
        <label className="grid gap-1 text-xs">
          Meta
          <select
            className={cn(selectClassName, "w-44")}
            value={kind}
            onChange={(event) => setKind(event.target.value as StrategySalesGoal["kind"])}
          >
            <option value="SALES">Número de vendas</option>
            <option value="REVENUE">Valor vendido (R$)</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          {kind === "SALES" ? "Vendas" : "Valor"}
          <Input
            className="w-32"
            inputMode="decimal"
            value={valueText}
            placeholder={kind === "SALES" ? "20" : "15000"}
            onChange={(event) => setValueText(event.target.value)}
          />
        </label>
        <Button type="submit" size="sm" disabled={save.isPending || !(value > 0)}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
        {goal && (
          <Button type="button" size="sm" variant="ghost" disabled={save.isPending} onClick={() => save.mutate(null)}>
            Tirar meta
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
          Cancelar
        </Button>
        <p className="text-muted-foreground w-full text-xs">
          O prazo é o do briefing{strategy.brief.deadlineDays ? ` (${strategy.brief.deadlineDays} dias)` : " (não informado)"}.
        </p>
      </form>
    );

  if (!goal)
    return canManage ? (
      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
        <Target className="h-4 w-4" />
        Definir meta de vendas
      </Button>
    ) : null;

  const percent = Math.min(100, progress?.percent ?? 0);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          <Target className="text-primary mr-1 inline h-4 w-4 align-text-bottom" />
          Meta: <strong>{goalText(goal, currency)}</strong>
          {progress && (
            <>
              {" "}
              · feito <strong>{goal.kind === "SALES" ? progress.achieved : formatMoney(progress.achieved, currency)}</strong> (
              {progress.percent}%)
            </>
          )}
          {progress?.deadline && <span className="text-muted-foreground"> · prazo {format(new Date(progress.deadline), "dd/MM")}</span>}
        </p>
        <div className="flex items-center gap-2">
          {progress?.onTrack !== null && progress?.onTrack !== undefined && (
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-semibold",
                progress.onTrack
                  ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
              )}
            >
              {progress.onTrack ? "No ritmo" : "Abaixo do ritmo"}
            </span>
          )}
          {canManage && (
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar meta" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div
        className="bg-muted relative h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
        {progress?.elapsedPercent != null && (
          <div
            className="bg-foreground/60 absolute top-0 h-full w-0.5"
            style={{ left: `${progress.elapsedPercent}%` }}
            title="Tempo que já passou"
          />
        )}
      </div>
      {!progress && <p className="text-muted-foreground text-xs">Atualize os resultados para ver o andamento.</p>}
    </div>
  );
};

/** Funil da camada de venda: atendimentos dos fluxos da estratégia até a venda, e o que mais trava. */
const SalesFunnel: FC<{ funnel: StrategySalesFunnel; currency: string | null }> = ({ funnel, currency }) => {
  const stages = [
    { label: "Conversas", value: funnel.conversations, rate: null },
    { label: "Negócios", value: funnel.deals, rate: pct(funnel.deals, funnel.conversations) },
    { label: "Qualificados", value: funnel.qualified, rate: pct(funnel.qualified, funnel.deals) },
    { label: "Reuniões", value: funnel.meetings, rate: pct(funnel.meetings, funnel.qualified) },
    { label: "Propostas enviadas", value: funnel.proposalsSent, rate: null },
    { label: "Vendas", value: funnel.won, rate: pct(funnel.won, funnel.qualified) },
  ];
  const max = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        {stages.map((stage) => (
          <li key={stage.label} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-2 text-sm">
            <span>{stage.label}</span>
            <span className="bg-muted h-2 overflow-hidden rounded-full">
              <span className="bg-primary block h-full rounded-full" style={{ width: `${(stage.value / max) * 100}%` }} />
            </span>
            <span className="tabular-nums">
              <strong>{stage.value}</strong>
              {stage.rate && <span className="text-muted-foreground"> · {stage.rate}</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground text-xs">
        Valor vendido {formatMoney(funnel.wonValue, currency)} · propostas aceitas {funnel.proposalsAccepted} · passagens da IA para a
        equipe {funnel.handoffs}
        {funnel.avgHoursToQualify !== null && ` · tempo médio até qualificar ${funnel.avgHoursToQualify.toString().replace(".", ",")} h`}
      </p>
      {!!funnel.agentOutcomes?.length && (
        <p className="text-sm">
          <span className="font-medium">Como o agente de IA encerrou as conversas: </span>
          {funnel.agentOutcomes.map((item) => `${item.label} ${item.count}`).join(" · ")}
        </p>
      )}
      {(funnel.topObjections.length > 0 || funnel.topMissingCriteria.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {funnel.topObjections.length > 0 && (
            <div>
              <p className="text-xs font-medium">Objeções mais ouvidas</p>
              <ul className="text-muted-foreground list-disc pl-5 text-sm">
                {funnel.topObjections.map((item) => (
                  <li key={item.text}>
                    {item.text} ({item.count})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {funnel.topMissingCriteria.length > 0 && (
            <div>
              <p className="text-xs font-medium">O que mais falta descobrir</p>
              <ul className="text-muted-foreground list-disc pl-5 text-sm">
                {funnel.topMissingCriteria.map((item) => (
                  <li key={item.text}>
                    {item.text} ({item.count})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Meta e camada de venda dentro dos resultados da estratégia. */
/** Funil do CRM onde a venda da estratégia é medida (o "Montar a venda" escolhe; aqui dá para trocar). */
const PipelinePicker: FC<Pick<Props, "strategy" | "canManage" | "onSaved" | "onGoalChanged">> = ({
  strategy,
  canManage,
  onSaved,
  onGoalChanged,
}) => {
  const { client, canUseCrm } = useClientContext();
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: canUseCrm,
  });
  const save = useMutation({
    mutationFn: (pipelineId: string | null) => marketingStrategyService.update(client.id, strategy.id, { pipelineId }),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      onSaved(saved);
      onGoalChanged();
      toast.success("Funil da venda atualizado");
    },
  });
  const pipelines = (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active || pipeline.id === strategy.pipelineId);
  if (!canUseCrm || !pipelines.length) return null;

  return (
    <label className="flex flex-wrap items-center gap-2 text-xs">
      Funil da venda
      <select
        className={cn(selectClassName, "w-56")}
        value={strategy.pipelineId ?? ""}
        disabled={!canManage || save.isPending}
        onChange={(event) => save.mutate(event.target.value || null)}
      >
        <option value="">Todos os funis</option>
        {pipelines.map((pipeline) => (
          <option key={pipeline.id} value={pipeline.id}>
            {pipeline.name}
          </option>
        ))}
      </select>
    </label>
  );
};

export const StrategySalesPanel: FC<Props> = (props) => {
  const { results } = props;
  const currency = results?.currency ?? null;
  const funnel = results?.sales ?? null;

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Vendas</h3>
        <PipelinePicker {...props} />
      </div>
      <SalesGoalCard {...props} currency={currency} />
      {funnel ? (
        <SalesFunnel funnel={funnel} currency={currency} />
      ) : (
        <p className="text-muted-foreground text-sm">
          O funil de vendas aparece quando um fluxo estiver ligado à estratégia (pelo passo "Montar a camada de venda" ou pelo atalho de um
          passo de fluxo) e começar a atender.
        </p>
      )}
    </div>
  );
};
