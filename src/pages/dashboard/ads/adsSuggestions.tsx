import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bot, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { suggestionStatusLabel } from "./adsUtils";
import { AdSuggestionCard } from "./components/adSuggestionCard";
import { AdvisorText } from "./components/advisorText";

const STATUSES: AdSuggestionStatus[] = ["OPEN", "ACCEPTED", "POSTPONED", "REJECTED"];

/** Auditoria da IA, análise diária e as sugestões da conta. */
export const AdsSuggestions: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AdSuggestionStatus>("OPEN");
  const params = { clientId: client.id, accountId: account.id };

  const advisorQuery = useQuery({
    queryKey: ["metaAds", "advisor", client.id, account.id],
    queryFn: () => metaAdsService.findAdvisorStatus({ params }),
    // Acompanha a análise até ela terminar e então traz as sugestões novas
    refetchInterval: (query) => (query.state.data?.latestAnalysis?.status === "RUNNING" ? 4000 : false),
  });
  const advisor = advisorQuery.data;
  const analysis = advisor?.latestAnalysis ?? null;
  const isRunning = analysis?.status === "RUNNING";

  const suggestionsQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "suggestions", client.id, account.id, status, analysis?.status],
    queryFn: () => metaAdsService.findSuggestions({ params, queries: { status } }),
  });

  const requestAudit = useMutation({
    mutationFn: metaAdsService.requestAudit,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "advisor"] });
      toast.success("Auditoria iniciada. As sugestões aparecem aqui quando terminar.");
    },
  });
  const setDailyAnalysis = useMutation({
    mutationFn: metaAdsService.setDailyAnalysis,
    onError: requestErrorHandling,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metaAds", "advisor"] }),
  });

  if (advisorQuery.isLoading) return <LoadingState />;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
        <Bot className="text-primary mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          {!advisor?.aiEnabled && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              A inteligência artificial não está ativa ou a cota do mês acabou. As sugestões já registradas continuam aqui.
            </p>
          )}
          {isRunning && (
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {analysis.kind === "AUDIT" ? "Auditando a conta" : "Analisando o dia"}, isso leva até um minuto…
            </p>
          )}
          {analysis && !isRunning && (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">
                {analysis.kind === "AUDIT" ? "Última auditoria" : "Última análise diária"} em{" "}
                {format(new Date(analysis.finishedAt ?? analysis.startedAt), "dd/MM HH:mm")}
                {analysis.status === "DONE" && ` · ${analysis.suggestionsCount} sugestão(ões) nova(s)`}
              </p>
              {analysis.status === "FAILED" && <p className="text-destructive text-sm">A análise falhou: {analysis.error}</p>}
              {analysis.summary && <AdvisorText text={analysis.summary} />}
            </div>
          )}
          {!analysis && (
            <p className="text-sm">
              A IA revisa a conta contra as boas práticas da Meta e cruza o gasto com as vendas do CRM. Cada sugestão traz o problema, os
              números e a mudança proposta.
            </p>
          )}
          {can("ads.manage") && (
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox
                checked={advisor?.dailyAnalysis ?? false}
                disabled={setDailyAnalysis.isPending}
                onCheckedChange={(checked) => setDailyAnalysis.mutate({ params, body: { enabled: checked === true } })}
              />
              Analisar todo dia de manhã (consome a cota de IA)
            </label>
          )}
        </div>
        {can("ads.manage") && (
          <Button
            size="sm"
            disabled={!advisor?.aiEnabled || isRunning || requestAudit.isPending}
            onClick={() => requestAudit.mutate({ params })}
          >
            <Sparkles className="h-4 w-4" />
            Auditar conta
          </Button>
        )}
      </div>

      <div className="flex rounded-md border p-0.5" role="group" aria-label="Situação das sugestões">
        {STATUSES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={status === option}
            onClick={() => setStatus(option)}
            className={cn("flex-1 rounded px-2 py-1 text-xs", status === option ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {suggestionStatusLabel[option]}
          </button>
        ))}
      </div>

      {suggestionsQuery.isLoading && <LoadingState className="justify-start py-2" />}
      {suggestionsQuery.isError && (
        <ErrorState
          message="Não foi possível carregar as sugestões."
          onRetry={() => suggestionsQuery.refetch()}
          isRetrying={suggestionsQuery.isFetching}
        />
      )}
      {suggestionsQuery.data?.length === 0 && (
        <EmptyState
          icon={Lightbulb}
          title={status === "OPEN" ? "Nenhuma sugestão aberta" : `Nenhuma sugestão ${suggestionStatusLabel[status].toLowerCase()}`}
          description={status === "OPEN" ? "Rode a auditoria ou converse com a IA na aba Estratégia." : undefined}
        />
      )}
      <div className="space-y-3">
        {suggestionsQuery.data?.map((suggestion) => (
          <AdSuggestionCard key={suggestion.id} suggestion={suggestion} currency={account.currency} compact={status !== "OPEN"} />
        ))}
      </div>
    </section>
  );
};
