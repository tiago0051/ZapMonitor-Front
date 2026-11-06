import { EmptyState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Loader2, RefreshCw, Repeat, X } from "lucide-react";
import { useEffect, type FC } from "react";
import { toast } from "sonner";
import { assetOriginLabel, pilotStepLabel } from "./pilotUtils";

type Props = { account: AdAccount; brand: AdBrandProfile; onChange: (brand: AdBrandProfile) => void };

/** Revisão diária: criativos novos para os anúncios cansados ou perdedores, que só vão para a Meta com aprovação. */
export const PilotRefreshes: FC<Props> = ({ account, brand, onChange }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const params = { clientId: client.id, accountId: account.id };
  const refreshesKey = ["metaAds", "pilotRefreshes", client.id, account.id];

  const refreshesQuery = useQuery({ queryKey: refreshesKey, queryFn: () => metaAdsService.findCreativeRefreshes({ params }) });
  const runsQuery = useQuery({
    queryKey: ["metaAds", "pilotRuns", client.id, account.id],
    queryFn: () => metaAdsService.findPilotRuns({ params }),
    refetchInterval: (query) => (query.state.data?.some((run) => run.status === "RUNNING") ? 4000 : false),
  });
  const lastReview = (runsQuery.data ?? []).find((run) => run.kind === "DAILY");
  const isReviewing = lastReview?.status === "RUNNING";

  const setDaily = useMutation({
    mutationFn: (enabled: boolean) => metaAdsService.setPilotDaily({ params, enabled }),
    onError: requestErrorHandling,
    onSuccess: onChange,
  });
  const review = useMutation({
    mutationFn: () => metaAdsService.requestPilotReview({ params }),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "pilotRuns", client.id, account.id] });
      toast.success("Revisão agendada");
    },
  });
  const afterDecision = () => {
    queryClient.invalidateQueries({ queryKey: refreshesKey });
    queryClient.invalidateQueries({ queryKey: ["metaAds", "changes"] });
  };
  const approve = useMutation({
    mutationFn: (refreshId: string) => metaAdsService.approveCreativeRefresh({ params: { clientId: client.id, refreshId } }),
    onError: requestErrorHandling,
    onSuccess: () => {
      afterDecision();
      toast.success("Anúncio novo criado no mesmo conjunto e o antigo pausado");
    },
  });
  const reject = useMutation({
    mutationFn: (refreshId: string) => metaAdsService.rejectCreativeRefresh({ params: { clientId: client.id, refreshId } }),
    onError: requestErrorHandling,
    onSuccess: afterDecision,
  });

  // Quando a revisão termina, as trocas novas aparecem
  const reviewFinishedAt = lastReview?.status === "DONE" ? lastReview.finishedAt : null;
  useEffect(() => {
    if (reviewFinishedAt) queryClient.invalidateQueries({ queryKey: ["metaAds", "pilotRefreshes", client.id, account.id] });
  }, [reviewFinishedAt, queryClient, client.id, account.id]);

  const refreshes = refreshesQuery.data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-semibold">5. Acompanhamento diário</h2>
          <p className="text-muted-foreground text-sm">
            Todo dia às 8h o piloto olha os anúncios dos últimos 14 dias. Para o que gastou sem vender ou teve o CTR caindo, ele propõe um
            criativo novo. Ao aprovar, o anúncio novo entra no mesmo conjunto e o antigo é pausado.
          </p>
        </div>
        {can("ads.manage") && (
          <Button size="sm" variant="outline" disabled={isReviewing || review.isPending} onClick={() => review.mutate()}>
            <RefreshCw className={cn("h-4 w-4", isReviewing && "animate-spin")} />
            Revisar agora
          </Button>
        )}
      </div>

      {can("ads.manage") && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={brand.pilotDailyEnabled}
            disabled={setDaily.isPending}
            onCheckedChange={(checked) => setDaily.mutate(checked === true)}
          />
          Revisar os criativos todo dia (consome a cota de IA; as trocas sempre esperam aprovação)
        </label>
      )}

      {lastReview && (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          {isReviewing && <Loader2 className="h-3 w-3 animate-spin" />}
          Última revisão {format(new Date(lastReview.startedAt), "dd/MM HH:mm")}:{" "}
          {isReviewing
            ? `${lastReview.step ? pilotStepLabel[lastReview.step] : "na fila"}…`
            : (lastReview.summary ?? lastReview.error ?? "—")}
        </p>
      )}

      {refreshesQuery.isSuccess && refreshes.length === 0 ? (
        <EmptyState icon={Repeat} title="Nenhuma troca esperando aprovação" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {refreshes.map((refresh) => (
            // No celular a imagem fica em cima do texto, em vez de espremer as duas colunas
            <article key={refresh.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row">
              {refresh.assetPreviewUrl ? (
                <img
                  src={refresh.assetPreviewUrl}
                  alt="Criativo proposto"
                  className="aspect-square w-full max-w-64 shrink-0 rounded object-cover sm:h-32 sm:w-32"
                />
              ) : (
                <div className="bg-muted aspect-square w-full max-w-64 shrink-0 rounded sm:h-32 sm:w-32" />
              )}
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <p className="text-muted-foreground text-xs">
                  Substitui <span className="text-foreground font-medium">{refresh.adName}</span>
                  {refresh.assetOrigin && ` · ${assetOriginLabel[refresh.assetOrigin]}`}
                </p>
                <p className="font-medium">{refresh.headline}</p>
                <p className="line-clamp-3">{refresh.primaryText}</p>
                <p className="text-muted-foreground text-xs">
                  {refresh.reason}. {refresh.evidence}
                </p>
                {refresh.error && <p className="text-destructive text-xs">{refresh.error}</p>}
                {can("ads.approve") && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" disabled={approve.isPending || reject.isPending} onClick={() => approve.mutate(refresh.id)}>
                      <Check className="h-4 w-4" />
                      Aprovar troca
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={approve.isPending || reject.isPending}
                      onClick={() => reject.mutate(refresh.id)}
                    >
                      <X className="h-4 w-4" />
                      Recusar
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
