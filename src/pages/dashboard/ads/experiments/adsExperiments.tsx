import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Plus } from "lucide-react";
import { useState, type FC } from "react";
import { ExperimentCard } from "./experimentCard";
import { experimentsQueryKey } from "./experimentsUtils";
import { NewExperimentDialog } from "./newExperimentDialog";

/** Testes com hipótese: compara conjuntos ou anúncios pelo custo por venda e propõe a verba em Mudanças. */
export const AdsExperiments: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const [isCreating, setIsCreating] = useState(false);

  const experimentsQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: experimentsQueryKey(client.id, account.id),
    queryFn: () => metaAdsService.findExperiments({ params: { clientId: client.id, accountId: account.id } }),
  });
  const experiments = experimentsQuery.data ?? [];
  // Em andamento primeiro, depois os mais novos
  const sorted = [...experiments].sort(
    (first, second) =>
      Number(second.status === "RUNNING") - Number(first.status === "RUNNING") || second.createdAt.localeCompare(first.createdAt),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold">Testes</h2>
          <p className="text-muted-foreground text-sm">
            Um teste compara de 2 a 4 conjuntos ou anúncios pelo custo por venda. Todo dia o sistema calcula a chance de cada um ser o
            melhor e propõe mudanças de verba em Mudanças, sempre esperando a sua aprovação.
          </p>
        </div>
        {can("ads.manage") && (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4" />
            Novo teste
          </Button>
        )}
      </div>

      {experimentsQuery.isLoading ? (
        <LoadingState />
      ) : experimentsQuery.isError ? (
        <ErrorState
          message="Não foi possível carregar os testes."
          onRetry={() => experimentsQuery.refetch()}
          isRetrying={experimentsQuery.isFetching}
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Nenhum teste ainda"
          description={
            "Campanhas publicadas com teste A/B viram um teste aqui automaticamente. " +
            (can("ads.manage")
              ? "Para comparar o que já está rodando, toque em Novo teste e escolha de 2 a 4 conjuntos ou anúncios."
              : "Peça a quem gerencia os anúncios para criar um.")
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} account={account} />
          ))}
        </div>
      )}

      {can("ads.manage") && <NewExperimentDialog account={account} open={isCreating} onOpenChange={setIsCreating} />}
    </div>
  );
};
