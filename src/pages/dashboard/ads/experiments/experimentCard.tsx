import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { RefreshCw, Square, Trophy } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { formatMoney } from "../adsUtils";
import { MetricHelp } from "../components/metricHelp";
import { formatPercent } from "../learnings/learningsUtils";
import { diaryQueryKey, experimentLevelLabel, experimentStatusInfo, experimentsQueryKey, formatDay } from "./experimentsUtils";

const ArmRow: FC<{ arm: AdExperimentArmResult; currency: string; isWinner: boolean; isRunning: boolean }> = ({
  arm,
  currency,
  isWinner,
  isRunning,
}) => (
  <li className={cn("space-y-1.5 rounded-md border p-2", isWinner && "border-green-500 bg-green-50/60 dark:bg-green-950/30")}>
    <div className="flex items-start gap-2">
      {isWinner && <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-label="Vencedor" />}
      <p className="min-w-0 flex-1 text-sm font-medium break-words">{arm.label}</p>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{formatPercent(arm.probBest)}</span>
    </div>
    <div
      role="meter"
      aria-label={`Chance de ${arm.label} ser o melhor`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(arm.probBest * 100)}
      className="bg-muted h-2 overflow-hidden rounded-full"
    >
      <div
        className={cn("h-full rounded-full", isWinner ? "bg-green-600" : "bg-primary")}
        style={{ width: `${Math.max(arm.probBest * 100, 1)}%` }}
      />
    </div>
    <p className="text-muted-foreground text-xs">
      {arm.sales} venda(s) · gasto {formatMoney(arm.spend, currency)} · custo por venda {formatMoney(arm.costPerSale, currency)}
    </p>
    {isRunning && <p className="text-xs">O sistema sugere {formatPercent(arm.budgetShare)} da verba</p>}
  </li>
);

/** Um teste: hipótese, chance de cada lado ser o melhor e o que fazer agora. */
export const ExperimentCard: FC<{ experiment: AdExperiment; account: AdAccount }> = ({ experiment, account }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const params = { clientId: client.id, accountId: account.id, experimentId: experiment.id };
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: experimentsQueryKey(client.id, account.id) });
    queryClient.invalidateQueries({ queryKey: diaryQueryKey(client.id, account.id) });
    queryClient.invalidateQueries({ queryKey: ["metaAds", "changes", client.id, account.id] });
  };
  const evaluate = useMutation({
    mutationFn: metaAdsService.evaluateExperiment,
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      invalidate();
      toast.success(updated.status === "RUNNING" ? "Teste avaliado" : `Teste concluído: ${experimentStatusInfo[updated.status].label}`);
    },
  });
  const stop = useMutation({
    mutationFn: metaAdsService.stopExperiment,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Teste encerrado");
    },
  });

  const isRunning = experiment.status === "RUNNING";
  const status = experimentStatusInfo[experiment.status];
  // Antes da primeira avaliação, mostra os lados sem números
  const arms: AdExperimentArmResult[] =
    experiment.results ??
    experiment.arms.map((arm) => ({ ...arm, spend: 0, conversations: 0, sales: 0, costPerSale: null, probBest: 0, budgetShare: 0 }));

  const onStop = async () => {
    if (
      await confirm({
        title: `Encerrar o teste "${experiment.name}"?`,
        description: "Ele para de ser avaliado e termina sem vencedor. Os anúncios continuam rodando como estão.",
        confirmLabel: "Encerrar teste",
        destructive: true,
      })
    )
      stop.mutate({ params });
  };

  return (
    <article className="bg-card space-y-3 rounded-lg border p-3 sm:p-4">
      {confirmDialog}
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold break-words">{experiment.name}</h3>
          <p className="text-muted-foreground text-xs">
            {experimentLevelLabel[experiment.level]} · início {formatDay(experiment.startDate)} · {isRunning ? "termina em" : "prazo até"}{" "}
            {formatDay(experiment.endsAt)}
            {experiment.concludedAt && ` · concluído em ${formatDay(experiment.concludedAt)}`}
          </p>
        </div>
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", status.className)}>{status.label}</span>
      </header>

      <p className="text-sm">
        <span className="text-muted-foreground">Hipótese: </span>
        {experiment.hypothesis}
      </p>

      <div className="space-y-1.5">
        <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
          Chance de ser o melhor
          <MetricHelp term="PROB_BEST" />
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {arms.map((arm) => (
            <ArmRow
              key={arm.metaId}
              arm={arm}
              currency={account.currency}
              isWinner={experiment.winnerMetaId === arm.metaId}
              isRunning={isRunning && !!experiment.results}
            />
          ))}
        </ul>
      </div>

      {experiment.conclusion ? (
        <p className="bg-muted/50 rounded-md p-2 text-sm">{experiment.conclusion}</p>
      ) : (
        !experiment.results && <p className="text-muted-foreground text-sm">Ainda não foi avaliado. A avaliação roda todo dia.</p>
      )}

      <footer className="flex flex-wrap items-center gap-2">
        {experiment.lastEvaluatedAt && (
          <span className="text-muted-foreground mr-auto text-xs">
            Avaliado em {format(new Date(experiment.lastEvaluatedAt), "dd/MM HH:mm")}
          </span>
        )}
        <Button asChild size="sm" variant="link" className="px-0">
          <Link to="?tab=changes">Ver propostas em Mudanças</Link>
        </Button>
        {isRunning && can("ads.manage") && (
          <>
            <Button size="sm" variant="outline" disabled={evaluate.isPending || stop.isPending} onClick={() => evaluate.mutate({ params })}>
              <RefreshCw className={cn("h-4 w-4", evaluate.isPending && "animate-spin")} />
              {evaluate.isPending ? "Avaliando…" : "Avaliar agora"}
            </Button>
            <Button size="sm" variant="outline" disabled={evaluate.isPending || stop.isPending} onClick={() => void onStop()}>
              <Square className="h-4 w-4" />
              {stop.isPending ? "Encerrando…" : "Encerrar"}
            </Button>
          </>
        )}
      </footer>
    </article>
  );
};
