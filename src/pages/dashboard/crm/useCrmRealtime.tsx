import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { crmService } from "@/services/api/crmService";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect } from "react";

type DealUpdatePayload = { dealId?: string; pipelineId?: string };

const boardKey = ["crm", "deals", "board"] as const;

// Mesma ordem do servidor: quem está há mais tempo na etapa primeiro
const byStageEntry = (first: Deal, second: Deal) =>
  first.stageEnteredAt.localeCompare(second.stageEnteredAt) || first.createdAt.localeCompare(second.createdAt);

/** Confere no navegador os filtros simples do quadro; os demais (categoria, origem, datas) pedem a lista ao servidor. */
const matchesBoard = (deal: Deal, queries: FindDealBoardRequestQuery): boolean | null => {
  if (queries.categoryId || queries.originType || queries.originMetaCampaignId || queries.startDate || queries.endDate) return null;
  if (deal.pipelineId !== queries.pipelineId) return false;
  if (queries.ownerUserId && deal.owner?.id !== queries.ownerUserId) return false;
  if (queries.serviceGroupIds && !queries.serviceGroupIds.split(",").includes(deal.serviceGroup?.id ?? "")) return false;
  if (queries.closedSince && deal.status !== "OPEN" && (deal.closedAt ?? deal.updatedAt) < queries.closedSince) return false;
  return true;
};

/** Troca, inclui ou tira só o negócio que mudou em cada quadro aberto; sem como decidir, recarrega aquele quadro. */
const applyToBoards = (queryClient: QueryClient, dealId: string, deal: Deal | null) => {
  for (const [queryKey, deals] of queryClient.getQueriesData<Deal[]>({ queryKey: boardKey })) {
    if (!deals) continue;
    const queries = queryKey[4] as FindDealBoardRequestQuery | undefined;
    const matches = deal && queries ? matchesBoard(deal, queries) : false;

    if (matches === null) {
      void queryClient.invalidateQueries({ queryKey, exact: true });
      continue;
    }

    const others = deals.filter((item) => item.id !== dealId);
    queryClient.setQueryData<Deal[]>(queryKey, matches && deal ? [...others, deal].sort(byStageEntry) : others);
  }
};

/**
 * Atualiza os negócios quando outra pessoa mexe em um deles. O aviso traz só o id; o negócio é buscado de novo com as
 * permissões de quem está vendo e trocado no quadro, sem recarregar o funil inteiro. Fora de um SocketProvider, não faz nada.
 */
export const useCrmRealtime = () => {
  const { socket, isConnected } = useSocketContext();
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDealUpdate = async (payload?: DealUpdatePayload) => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "myTasks"] });

      const dealId = payload?.dealId;
      if (!dealId) {
        void queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
        return;
      }

      // Relatório, negócios do contato e o histórico do negócio são pequenos: recarregam inteiros
      void queryClient.invalidateQueries({ queryKey: ["crm", "deals", "report"] });
      void queryClient.invalidateQueries({ queryKey: ["crm", "deals", "contact"] });
      void queryClient.invalidateQueries({ queryKey: ["crm", "deals", "events", dealId] });
      void queryClient.invalidateQueries({ queryKey: ["crm", "deals", "tasks", dealId] });

      // Sem quadro aberto, basta a ficha (se estiver aberta) recarregar
      if (queryClient.getQueriesData({ queryKey: boardKey }).length === 0) {
        void queryClient.invalidateQueries({ queryKey: ["crm", "deals", "detail", dealId] });
        return;
      }

      try {
        // Também atualiza a ficha aberta; dois avisos seguidos aproveitam a mesma busca
        const deal = await queryClient.fetchQuery({
          // Falha aqui não vira aviso na tela: o quadro só é recarregado
          meta: { errorHandledInline: true },
          queryKey: ["crm", "deals", "detail", dealId],
          queryFn: () => crmService.findDeal({ params: { clientId: client.id, dealId } }),
          staleTime: 1000,
        });
        applyToBoards(queryClient, dealId, deal);
      } catch (error) {
        // Excluído ou fora do que o usuário pode ver: some do quadro; outra falha recarrega os quadros
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status === 403 || status === 404) applyToBoards(queryClient, dealId, null);
        else void queryClient.invalidateQueries({ queryKey: boardKey });
      }
    };

    socket.on("crm:deal:update", handleDealUpdate);

    return () => {
      socket.off("crm:deal:update", handleDealUpdate);
    };
  }, [socket, isConnected, queryClient, client.id]);
};
