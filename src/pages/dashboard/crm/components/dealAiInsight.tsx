import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, formatDistanceToNow, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, ListPlus, RefreshCw, Sparkles } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { aiScoreLabel, findPipelineStage } from "../crmUtils";

type DealAiInsightProps = {
  deal: Deal;
  pipeline: Pipeline | undefined;
  onMove: (stage: PipelineStage) => void;
};

/** Nota, justificativa, etapa sugerida e próximo passo da IA, com atalhos para aplicar a sugestão. */
export const DealAiInsight: FC<DealAiInsightProps> = ({ deal, pipeline, onMove }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
    queryClient.invalidateQueries({ queryKey: ["crm", "myTasks"] });
  };

  const analyze = useMutation({
    mutationFn: crmService.analyzeDeal,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Análise atualizada");
    },
  });

  // O próximo passo vira uma tarefa para amanhã às 9h, atribuída a quem clicou
  const createTask = useMutation({
    mutationFn: crmService.createDealTask,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Tarefa criada com o próximo passo");
    },
  });

  const insight = deal.aiInsight;
  const suggestedStage = findPipelineStage(pipeline, insight?.suggestedStageId ?? null);
  const canMoveToSuggestion = deal.status === "OPEN" && !!suggestedStage && suggestedStage.id !== deal.stageId;

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="text-primary h-3.5 w-3.5" />
          Análise da IA
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          disabled={analyze.isPending}
          onClick={() => analyze.mutate({ params: { clientId: client.id, dealId: deal.id } })}
        >
          <RefreshCw className={analyze.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          {insight ? "Analisar de novo" : "Analisar agora"}
        </Button>
      </div>

      {!insight || deal.aiScore === null ? (
        <p className="text-muted-foreground text-sm">
          A IA lê a conversa com o contato e dá uma nota de 0 a 100 para a chance de ganho, sugere a etapa e o próximo passo. A análise
          também roda sozinha quando um atendimento termina.
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{deal.aiScore}</span>
            <span className="text-muted-foreground text-sm">/ 100 · {aiScoreLabel(deal.aiScore)}</span>
          </div>
          {insight.scoreReason && <p className="text-sm">{insight.scoreReason}</p>}

          {insight.nextStep && (
            <div className="bg-muted/50 space-y-2 rounded-md p-2">
              <p className="text-muted-foreground text-xs">Próximo passo</p>
              <p className="text-sm">{insight.nextStep}</p>
              {deal.status === "OPEN" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={createTask.isPending}
                  onClick={() =>
                    createTask.mutate({
                      params: { clientId: client.id, dealId: deal.id },
                      body: {
                        title: insight.nextStep.substring(0, 200),
                        dueAt: setMinutes(setHours(addDays(new Date(), 1), 9), 0).toISOString(),
                      },
                    })
                  }
                >
                  <ListPlus className="h-3.5 w-3.5" />
                  Criar tarefa
                </Button>
              )}
            </div>
          )}

          {canMoveToSuggestion && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMove(suggestedStage)}>
              <ArrowRight className="h-3.5 w-3.5" />
              Mover para {suggestedStage.name}
            </Button>
          )}

          <p className="text-muted-foreground text-xs">
            Analisado {formatDistanceToNow(new Date(insight.analyzedAt), { locale: ptBR, addSuffix: true })}
          </p>
        </>
      )}
    </section>
  );
};
