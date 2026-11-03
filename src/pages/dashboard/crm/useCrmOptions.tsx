import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { memberService } from "@/services/api/memberService";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { useQuery } from "@tanstack/react-query";

// Funis, grupos e usuários usados nos filtros e formulários do CRM
export const useCrmOptions = () => {
  const { client, can } = useClientContext();
  const canViewAll = can("crm.viewAll");

  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
  });

  const allServiceGroupsQuery = useQuery({
    queryKey: ["serviceGroups", client.id],
    queryFn: () => serviceGroupService.findAll({ params: { clientId: client.id } }),
  });

  const myServiceGroupsQuery = useQuery({
    queryKey: ["serviceGroups", client.id, "mine"],
    queryFn: () => serviceGroupService.findMine({ params: { clientId: client.id } }),
    enabled: !canViewAll,
  });

  const membersQuery = useQuery({
    queryKey: ["members", client.id, "active-list"],
    queryFn: () => memberService.findAll({ params: { clientId: client.id }, queries: { page: 1, take: 100, status: "ACTIVE" } }),
  });

  return {
    canViewAll,
    pipelines: pipelinesQuery.data ?? [],
    activePipelines: (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active),
    // Grupos cujos negócios o usuário pode ver: todos para quem tem crm.viewAll, os próprios para os demais
    visibleServiceGroups: (canViewAll ? allServiceGroupsQuery.data : myServiceGroupsQuery.data) ?? [],
    // Destinos de uma transferência: qualquer grupo do cliente
    allServiceGroups: allServiceGroupsQuery.data ?? [],
    members: membersQuery.data?.items ?? [],
    isLoading: pipelinesQuery.isLoading || allServiceGroupsQuery.isLoading || myServiceGroupsQuery.isLoading,
  };
};
