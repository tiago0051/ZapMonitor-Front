import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";

/** Gasto do mês contra o teto das travas: barra do topo de Anúncios e diálogo de ativar campanha. */
export const useSpendStatus = (accountId: string | undefined) => {
  const { client } = useClientContext();

  return useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "spendStatus", client.id, accountId ?? ""],
    queryFn: () => metaAdsService.findSpendStatus({ params: { clientId: client.id, accountId: accountId! } }),
    enabled: !!accountId,
    staleTime: 60_000,
  });
};
