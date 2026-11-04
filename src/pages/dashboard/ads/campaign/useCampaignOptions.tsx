import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { flowService } from "@/services/api/flowService";
import { metaAdsService } from "@/services/api/metaAdsService";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";

export type CampaignAudienceOption = { id: string; name: string; isLookalike: boolean; origin: "meta" | "crm" };

/** Números, páginas, fluxos, funis, grupos, públicos e criativos que a criação de campanha oferece. */
export const useCampaignOptions = (account: AdAccount) => {
  const { client, access } = useClientContext();
  const params = { clientId: client.id, accountId: account.id };

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id, "ads"],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
  });
  const pagesQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "availablePages", client.id],
    queryFn: () => metaAdsService.findAvailablePages({ params: { clientId: client.id } }),
  });
  const flowsQuery = useQuery({ queryKey: ["flows", client.id], queryFn: () => flowService.findAll({ params: { clientId: client.id } }) });
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: access.crmEnabled,
  });
  const groupsQuery = useQuery({
    queryKey: ["serviceGroups", client.id],
    queryFn: () => serviceGroupService.findAll({ params: { clientId: client.id } }),
  });
  const structureQuery = useQuery({
    queryKey: ["metaAds", "structure", client.id, account.id],
    queryFn: () => metaAdsService.findStructure({ params }),
  });
  const crmAudiencesQuery = useQuery({
    queryKey: ["metaAds", "crmAudiences", client.id, account.id],
    queryFn: () => metaAdsService.findCrmAudiences({ params }),
  });
  const assetsQuery = useQuery({
    queryKey: ["metaAds", "assets", client.id, account.id],
    queryFn: () => metaAdsService.findAssets({ params }),
  });

  const metaAudiences = structureQuery.data?.audiences ?? [];
  const audiences: CampaignAudienceOption[] = [
    ...metaAudiences.map((audience) => ({
      id: audience.metaId,
      name: audience.name,
      isLookalike: audience.subtype === "LOOKALIKE",
      origin: "meta" as const,
    })),
    ...(crmAudiencesQuery.data ?? [])
      .filter((audience) => audience.metaAudienceId && !metaAudiences.some((item) => item.metaId === audience.metaAudienceId))
      .map((audience) => ({
        id: audience.metaAudienceId!,
        name: audience.name,
        isLookalike: audience.kind === "LOOKALIKE",
        origin: "crm" as const,
      })),
  ];

  return {
    configurations: configurationsQuery.data?.items ?? [],
    pages: (pagesQuery.data ?? []).filter((page) => page.hasAccess),
    pagesError: pagesQuery.isError,
    flows: (flowsQuery.data ?? []).filter((flow) => flow.active),
    pipelines: (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active),
    serviceGroups: groupsQuery.data ?? [],
    audiences,
    assets: assetsQuery.data ?? [],
    isLoading: configurationsQuery.isLoading || flowsQuery.isLoading || assetsQuery.isLoading,
  };
};
