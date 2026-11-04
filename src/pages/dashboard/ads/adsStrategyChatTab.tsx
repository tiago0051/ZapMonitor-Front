import { LoadingState } from "@/components/state-message";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { AdsStrategyChat } from "./adsStrategyChat";

/** Confere se a IA está ativa antes de abrir a conversa. */
export const AdsStrategyChatTab: FC<{ account: AdAccount }> = ({ account }) => {
  const { client } = useClientContext();
  const advisorQuery = useQuery({
    queryKey: ["metaAds", "advisor", client.id, account.id],
    queryFn: () => metaAdsService.findAdvisorStatus({ params: { clientId: client.id, accountId: account.id } }),
  });

  if (advisorQuery.isLoading) return <LoadingState />;

  return <AdsStrategyChat account={account} aiEnabled={advisorQuery.data?.aiEnabled ?? false} />;
};
