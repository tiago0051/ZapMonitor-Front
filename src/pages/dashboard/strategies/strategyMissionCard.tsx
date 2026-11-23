import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { assistantService } from "@/services/api/assistantService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bot, MessageSquare } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";
import { assistantKeys } from "../assistant/assistantUtils";

type Props = { strategy: MarketingStrategy; canManage: boolean };

/**
 * Missão do assistente na estratégia: com missão ativa, o resumo da última revisão e quando será a próxima; sem ela, o
 * atalho que abre o assistente com o pedido de conduzir a estratégia até a meta (a pessoa revisa e envia).
 */
export const StrategyMissionCard: FC<Props> = ({ strategy, canManage }) => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const projectsQuery = useQuery({
    queryKey: assistantKeys.projects(client.id),
    queryFn: () => assistantService.findProjects(client.id),
  });
  const mission = projectsQuery.data?.find((project) => project.strategyId === strategy.id && project.status === "ACTIVE") ?? null;

  if (projectsQuery.isLoading || strategy.status !== "READY") return null;

  const request = [
    `Quero que você conduza a estratégia "${strategy.name}" (id ${strategy.id}) até a meta de vendas.`,
    strategy.brief.salesGoal ? null : "Ainda não tem meta: me pergunte qual é.",
    "Confira a camada de venda, proponha os próximos passos e abra a missão para revisar sozinho.",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Bot className="text-primary h-4 w-4" />
            Missão do assistente
          </h2>
          <p className="text-muted-foreground text-xs">
            {mission
              ? `O assistente revisa a estratégia a cada 7 dias (3 se a meta atrasar) e propõe os próximos planos para aprovação.`
              : "O assistente pode conduzir esta estratégia até a meta: revisa sozinho e propõe os próximos planos, que só rodam depois de aprovados."}
          </p>
        </div>
        {mission ? (
          <div className="flex flex-wrap gap-2">
            {mission.conversationId && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`${baseUrl}/assistant?conversa=${mission.conversationId}`}>
                  <MessageSquare className="h-4 w-4" />
                  Abrir a conversa
                </Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link to={`${baseUrl}/assistant?tab=aprovar`}>Planos para aprovar</Link>
            </Button>
          </div>
        ) : (
          canManage && (
            <Button size="sm" asChild>
              <Link to={`${baseUrl}/assistant?mensagem=${encodeURIComponent(request)}`}>
                <Bot className="h-4 w-4" />
                Conduzir com o assistente
              </Link>
            </Button>
          )
        )}
      </div>

      {mission && (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground text-xs">
            {mission.lastReviewAt ? `Última revisão em ${format(new Date(mission.lastReviewAt), "dd/MM")}` : "Ainda sem revisão"}
            {mission.nextReviewAt && ` · próxima em ${format(new Date(mission.nextReviewAt), "dd/MM")}`}
          </p>
          {mission.reviewSummary && <p className="line-clamp-6 whitespace-pre-wrap">{mission.reviewSummary}</p>}
        </div>
      )}
    </section>
  );
};
