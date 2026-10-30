import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";

/** Fluxos para os quais o fluxo encaminha pelo nó "Ir para fluxo" (espelha findFlowTargetIds do backend). */
export const findFlowTargetIds = (definition: FlowDefinition) => [
  ...new Set(definition.nodes.filter((node) => node.type === "flow" && node.data.flowId).map((node) => node.data.flowId!)),
];

export const findFlowSources = (flows: Flow[], flowId: string) =>
  flows.filter((flow) => flow.id !== flowId && findFlowTargetIds(flow.definition).includes(flowId));

export const useWhatsappConfigurations = (clientId: string) => {
  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", clientId],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId }, queries: { page: 1, take: 100 } }),
  });

  return configurationsQuery.data?.items ?? [];
};
