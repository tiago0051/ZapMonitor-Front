import { ErrorState, LoadingState } from "@/components/state-message";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useCampaignOptions } from "../campaign/useCampaignOptions";
import { PilotBrand } from "./pilotBrand";
import { PilotCampaign } from "./pilotCampaign";
import { PilotIdentity } from "./pilotIdentity";
import { PilotRefreshes } from "./pilotRefreshes";
import { PilotScoreboard } from "./pilotScoreboard";

type Props = { account: AdAccount; onOpenDraft: (draftId: string) => void };

/**
 * Piloto automático: o usuário passa a base da marca e a IA faz o resto — lê a identidade e o histórico, monta a campanha
 * (de teste, se não houver histórico) com os criativos gerados e acompanha todo dia. Tudo espera aprovação.
 */
export const AdsPilot: FC<Props> = ({ account, onOpenDraft }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const options = useCampaignOptions(account);
  const brandKey = ["metaAds", "pilotBrand", client.id, account.id];

  const brandQuery = useQuery({
    queryKey: brandKey,
    queryFn: () => metaAdsService.findBrandProfile({ params: { clientId: client.id, accountId: account.id } }),
  });
  const setBrand = (brand: AdBrandProfile) => queryClient.setQueryData(brandKey, brand);

  if (brandQuery.isLoading) return <LoadingState />;
  if (!brandQuery.data)
    return (
      <ErrorState message="Não foi possível carregar o piloto." onRetry={() => brandQuery.refetch()} isRetrying={brandQuery.isFetching} />
    );

  const brand = brandQuery.data;
  const pages = options.pages.map((page) => ({ metaPageId: page.metaPageId, name: page.name }));

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <PilotBrand key={`brand-${brand.id}`} account={account} brand={brand} onChange={setBrand} />
      <PilotIdentity account={account} brand={brand} pages={pages} onChange={setBrand} />
      <PilotScoreboard account={account} brand={brand} onChange={setBrand} />
      <PilotCampaign account={account} brand={brand} configurations={options.configurations} pages={pages} onOpenDraft={onOpenDraft} />
      <PilotRefreshes account={account} brand={brand} onChange={setBrand} />
    </div>
  );
};
