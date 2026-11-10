import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowRight, Check, GitPullRequestArrow, Undo2, X } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { changeStateLabel, changeStatusInfo, suggestionActionLabel, targetLevelLabel } from "./adsUtils";

const PENDING: AdChangeStatus[] = ["PENDING_APPROVAL", "BLOCKED", "FAILED"];
const HISTORY: AdChangeStatus[] = ["APPLIED", "REVERTED", "REJECTED", "EXPIRED"];

const ChangeCard: FC<{ change: AdChange; currency: string }> = ({ change, currency }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [isConfirmingRevert, setIsConfirmingRevert] = useState(false);
  const status = changeStatusInfo[change.status];
  const params = { clientId: client.id, changeId: change.id };

  const onSuccess = (message: string) => (result: AdChange) => {
    queryClient.invalidateQueries({ queryKey: ["metaAds"] });
    if (result.status === "APPLIED" || result.status === "REVERTED" || result.status === "REJECTED") toast.success(message);
    else toast.error(result.error ?? "A mudança não foi aplicada");
  };
  const approve = useMutation({
    mutationFn: metaAdsService.approveChange,
    onError: requestErrorHandling,
    onSuccess: onSuccess("Mudança aplicada na Meta"),
  });
  const reject = useMutation({
    mutationFn: metaAdsService.rejectChange,
    onError: requestErrorHandling,
    onSuccess: onSuccess("Mudança recusada"),
  });
  const revert = useMutation({
    mutationFn: metaAdsService.revertChange,
    onError: requestErrorHandling,
    onSuccess: onSuccess("Mudança desfeita"),
  });
  const isPending = approve.isPending || reject.isPending || revert.isPending;
  const origin = change.revertOfChangeId
    ? "Desfazer de uma mudança"
    : change.origin === "ATTENDANCE"
      ? "Fila do atendimento cheia"
      : change.origin === "ATTENDANCE_RESTORE"
        ? "Fila do atendimento normalizou"
        : change.ruleName
          ? `Regra "${change.ruleName}"`
          : change.suggestionTitle
            ? `Sugestão: ${change.suggestionTitle}`
            : "Mudança";

  return (
    <article className="bg-card space-y-2 rounded-lg border p-3">
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {suggestionActionLabel({ type: change.type, value: change.after.dailyBudget }, currency)} ·{" "}
            {targetLevelLabel[change.targetLevel]} {change.targetName}
          </p>
          <p className="text-muted-foreground text-xs">
            {origin} · {format(new Date(change.createdAt), "dd/MM HH:mm")}
            {change.requestedByName && ` · pedida por ${change.requestedByName}`}
          </p>
        </div>
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", status.className)}>{status.label}</span>
      </header>
      {change.reason && <p className="text-sm">{change.reason}</p>}
      {change.expiresAt && change.status === "PENDING_APPROVAL" && (
        <p className="text-muted-foreground text-xs">
          Vale até {format(new Date(change.expiresAt), "HH:mm")}; depois disso a fila é conferida de novo.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="bg-muted rounded px-2 py-1">{changeStateLabel(change.type, change.before, currency)}</span>
        <ArrowRight className="text-muted-foreground h-4 w-4" />
        <span className="bg-primary/10 text-primary rounded px-2 py-1 font-medium">
          {changeStateLabel(change.type, change.after, currency)}
        </span>
      </div>
      {change.status === "PENDING_APPROVAL" && (
        <p className="text-muted-foreground text-xs">O antes é da última sincronização; o valor real é lido na Meta ao aplicar.</p>
      )}
      {change.error && change.status !== "APPLIED" && <p className="text-destructive text-xs">{change.error}</p>}

      <p className="text-muted-foreground text-xs">
        {change.appliedAt &&
          `Aplicada em ${format(new Date(change.appliedAt), "dd/MM HH:mm")}${change.approvedByName ? ` por ${change.approvedByName}` : " pela regra"}. `}
        {change.status === "REJECTED" && change.approvedByName && `Recusada por ${change.approvedByName}. `}
        {change.revertedAt &&
          `Desfeita em ${format(new Date(change.revertedAt), "dd/MM HH:mm")}${change.revertedByName ? ` por ${change.revertedByName}` : ""}.`}
      </p>

      {can("ads.approve") && (
        <footer className="flex flex-wrap gap-2">
          {PENDING.includes(change.status) && (
            <>
              <Button size="sm" disabled={isPending} onClick={() => approve.mutate({ params })}>
                <Check className="h-3.5 w-3.5" />
                {change.status === "PENDING_APPROVAL" ? "Aprovar e aplicar" : "Tentar de novo"}
              </Button>
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => reject.mutate({ params })}>
                <X className="h-3.5 w-3.5" />
                Recusar
              </Button>
            </>
          )}
          {change.status === "APPLIED" &&
            !change.revertOfChangeId &&
            (isConfirmingRevert ? (
              <>
                <span className="self-center text-xs">Voltar ao estado anterior na Meta?</span>
                <Button size="sm" variant="destructive" disabled={isPending} onClick={() => revert.mutate({ params })}>
                  Desfazer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsConfirmingRevert(false)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setIsConfirmingRevert(true)}>
                <Undo2 className="h-3.5 w-3.5" />
                Desfazer
              </Button>
            ))}
        </footer>
      )}
    </article>
  );
};

/** Mudanças esperando aprovação e o histórico do que foi aplicado, recusado ou desfeito. */
export const AdsChanges: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const [view, setView] = useState<"pending" | "history">("pending");

  const changesQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "changes", client.id, account.id, view],
    queryFn: () =>
      metaAdsService.findChanges({
        params: { clientId: client.id, accountId: account.id },
        queries: { status: (view === "pending" ? PENDING : HISTORY).join(",") },
      }),
  });

  return (
    <section className="space-y-4">
      <div className="flex rounded-md border p-0.5" role="group" aria-label="Mudanças">
        {(["pending", "history"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={cn(
              "focus-visible:ring-ring/50 flex-1 rounded px-2 py-1 text-xs outline-none focus-visible:ring-[3px]",
              view === option ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {option === "pending" ? "Para aprovar" : "Histórico"}
          </button>
        ))}
      </div>
      {view === "pending" && !can("ads.approve") && (
        <p className="text-muted-foreground text-xs">Só quem tem a permissão de aprovar anúncios aplica as mudanças na Meta.</p>
      )}

      {changesQuery.isLoading && <LoadingState className="justify-start py-2" />}
      {changesQuery.isError && (
        <ErrorState
          message="Não foi possível carregar as mudanças."
          onRetry={() => changesQuery.refetch()}
          isRetrying={changesQuery.isFetching}
        />
      )}
      {changesQuery.data?.length === 0 && (
        <EmptyState
          icon={GitPullRequestArrow}
          title={view === "pending" ? "Nenhuma mudança para aprovar" : "Nenhuma mudança aplicada ainda"}
          description={view === "pending" ? "Aceite uma sugestão com ação ou crie uma regra em Automação." : undefined}
        />
      )}
      <div className="space-y-3">
        {changesQuery.data?.map((change) => (
          <ChangeCard key={change.id} change={change} currency={account.currency} />
        ))}
      </div>
    </section>
  );
};
