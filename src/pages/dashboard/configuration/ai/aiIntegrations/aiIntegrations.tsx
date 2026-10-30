import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { aiIntegrationService } from "@/services/api/aiIntegrationService";
import { aiService } from "@/services/api/aiService";
import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useParams } from "react-router";
import { AiIntegrationCard } from "./components/aiIntegrationCard";
import { aiIntegrationsQueryKey } from "./useAiIntegrationMutations";

export const AiIntegrations = () => {
  const { clientId } = useParams();

  const aiConfigQuery = useQuery({
    queryKey: ["aiConfig", clientId],
    queryFn: () => aiService.getClientAiConfig({ params: { clientId: clientId! } }),
    retry: false,
  });

  const providersQuery = useQuery({
    queryKey: ["aiIntegrationProviders", clientId],
    queryFn: () => aiIntegrationService.findAllProviders({ params: { clientId: clientId! } }),
  });

  const integrationsQuery = useQuery({
    queryKey: aiIntegrationsQueryKey(clientId!),
    queryFn: () => aiIntegrationService.findAll({ params: { clientId: clientId! } }),
  });

  const isAiDisabled = !aiConfigQuery.isLoading && !aiConfigQuery.data?.enabled;
  const isLoading = providersQuery.isLoading || integrationsQuery.isLoading;
  const isError = providersQuery.isError || integrationsQuery.isError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrações de IA</CardTitle>
        <CardDescription>Conecte ferramentas externas para a IA consultar e agir durante o atendimento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAiDisabled && (
          <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            {aiConfigQuery.data
              ? "A IA deste cliente está desligada. As integrações só funcionam com a IA ativa."
              : "A IA deste cliente ainda não foi configurada. As integrações só funcionam com a IA configurada e ativa."}
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {isError && <p className="text-destructive text-sm">Não foi possível carregar as integrações.</p>}

        {providersQuery.data && integrationsQuery.data && (
          <div className="grid gap-4 lg:grid-cols-2">
            {providersQuery.data.map((provider) => (
              <AiIntegrationCard
                key={provider.key}
                clientId={clientId!}
                provider={provider}
                integration={integrationsQuery.data.find((integration) => integration.provider === provider.key)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
