import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { planUsageService } from "@/services/api/planUsageService";
import { useQuery } from "@tanstack/react-query";
import { PauseCircle } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";

// O consumo muda devagar; a cada 5 minutos basta para a faixa aparecer pouco depois de acabar
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Faixa no topo do painel, para todos, quando a IA do mês acabou e os agentes estão pausados. */
export const AiPausedBanner: FC = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();

  const aiStatusQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["planUsage", client.id, "aiStatus"],
    queryFn: () => planUsageService.findAiStatus(client.id),
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: REFRESH_INTERVAL_MS,
  });

  if (!aiStatusQuery.data?.includesAi || !aiStatusQuery.data.paused) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-start gap-2 border-b bg-red-50 px-4 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200"
    >
      <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        A IA do mês acabou: os agentes de IA estão pausados e os contatos novos vão para a fila dos atendentes até o próximo mês.{" "}
        {can("members.manage") ? (
          <Link to={`${baseUrl}/configuration?tab=plan`} className="font-medium underline underline-offset-2">
            Ver o consumo
          </Link>
        ) : (
          "Avise o administrador da empresa."
        )}
      </p>
    </div>
  );
};
