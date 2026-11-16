import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { type FC } from "react";
import { toast } from "sonner";
import { recommendationLabel } from "./strategyUtils";

type Props = { strategy: MarketingStrategy; canManage: boolean };

/** Revisão da IA (toda segunda ou quando pedida): o que avançar, ajustar, pausar ou trocar, com aceite de cada recomendação. */
export const StrategyReviewPanel: FC<Props> = ({ strategy, canManage }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const queryKey = ["marketingStrategyReview", client.id, strategy.id];

  const reviewQuery = useQuery({
    queryKey,
    queryFn: () => marketingStrategyService.findLatestReview(client.id, strategy.id),
    refetchInterval: (query) => (query.state.data?.status === "GENERATING" ? 4000 : false),
  });
  const review = reviewQuery.data;

  const request = useMutation({
    mutationFn: () => marketingStrategyService.requestReview(client.id, strategy.id),
    onError: requestErrorHandling,
    onSuccess: (created) => queryClient.setQueryData(queryKey, created),
  });
  const decide = useMutation({
    mutationFn: ({ recommendationId, decision }: { recommendationId: string; decision: "ACCEPT" | "DISMISS" }) =>
      marketingStrategyService.decideRecommendation(client.id, strategy.id, review!.id, recommendationId, decision),
    onError: requestErrorHandling,
    onSuccess: (updated, { recommendationId, decision }) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ["marketingStrategy", client.id, strategy.id] });
      queryClient.invalidateQueries({ queryKey: ["marketingStrategies", client.id] });
      const outcome = updated.recommendations.find((item) => item.id === recommendationId)?.outcome;
      toast.success(decision === "ACCEPT" ? (outcome ?? "Recomendação aceita") : "Recomendação dispensada");
    },
  });

  const isGenerating = review?.status === "GENERATING" || request.isPending;

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Revisão da IA</h2>
          <p className="text-muted-foreground text-xs">
            Toda segunda, a IA compara os resultados com o plano e diz o que fazer.
            {review && review.status !== "GENERATING" && ` Última em ${format(new Date(review.createdAt), "dd/MM 'às' HH:mm")}.`}
          </p>
        </div>
        {canManage && strategy.status === "READY" && (
          <Button size="sm" variant="outline" disabled={isGenerating} onClick={() => request.mutate()}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Revisar agora
          </Button>
        )}
      </div>

      {isGenerating ? (
        <p role="status" className="text-muted-foreground text-sm">
          A IA está recalculando os resultados e revisando os passos…
        </p>
      ) : review?.status === "FAILED" ? (
        <p className="text-destructive text-sm">{review.error}</p>
      ) : !review ? (
        <p className="text-muted-foreground text-sm">A primeira revisão sai uma semana depois do início, ou quando você pedir.</p>
      ) : (
        <div className="space-y-3">
          {review.summary && <p className="text-sm">{review.summary}</p>}
          <ul className="grid gap-2">
            {review.recommendations.map((recommendation) => {
              const pending = recommendation.status === "PENDING";
              const needsPlanner = recommendation.kind === "ADJUST" || recommendation.kind === "PAUSE";
              return (
                <li key={recommendation.id} className={cn("grid gap-1.5 rounded-md border p-3 text-sm", !pending && "opacity-70")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">{recommendationLabel[recommendation.kind]}</span>
                    {recommendation.stepOrder && <span className="text-muted-foreground text-xs">Passo {recommendation.stepOrder}</span>}
                    <span className="font-medium">{recommendation.title}</span>
                  </div>
                  <p className="text-muted-foreground">{recommendation.detail}</p>
                  {pending && canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={decide.isPending || (needsPlanner && !can("planner.manage"))}
                        title={needsPlanner && !can("planner.manage") ? "Precisa da permissão de criar tarefas no Planejamento" : undefined}
                        onClick={() => decide.mutate({ recommendationId: recommendation.id, decision: "ACCEPT" })}
                      >
                        <Check className="h-4 w-4" />
                        {recommendation.kind === "SWITCH_PLAYBOOK"
                          ? "Refazer com a nova estratégia"
                          : recommendation.kind === "ADVANCE"
                            ? "Concluir o passo"
                            : "Virar tarefa"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ recommendationId: recommendation.id, decision: "DISMISS" })}
                      >
                        <X className="h-4 w-4" />
                        Dispensar
                      </Button>
                    </div>
                  ) : (
                    !pending && (
                      <p className="text-xs">
                        {recommendation.status === "ACCEPTED" ? `Aceita: ${recommendation.outcome ?? ""}` : "Dispensada"}
                      </p>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
