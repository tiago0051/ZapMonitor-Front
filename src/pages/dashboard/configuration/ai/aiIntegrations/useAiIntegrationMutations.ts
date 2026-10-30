import { aiIntegrationService } from "@/services/api/aiIntegrationService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showAiIntegrationError } from "./aiIntegrationUtils";

export const aiIntegrationsQueryKey = (clientId: string) => ["aiIntegrations", clientId];

const replaceIntegration = (list: AiIntegration[] | undefined, integration: AiIntegration) => {
  if (!list) return [integration];
  const exists = list.some((item) => item.provider === integration.provider);
  return exists ? list.map((item) => (item.provider === integration.provider ? integration : item)) : [...list, integration];
};

export const useAiIntegrationMutations = (clientId: string, provider: AiIntegrationProviderKey) => {
  const queryClient = useQueryClient();
  const queryKey = aiIntegrationsQueryKey(clientId);

  const setIntegration = (integration: AiIntegration) => {
    queryClient.setQueryData<AiIntegration[]>(queryKey, (list) => replaceIntegration(list, integration));
  };

  const optimistic = async (update: (integration: AiIntegration) => AiIntegration) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<AiIntegration[]>(queryKey);
    queryClient.setQueryData<AiIntegration[]>(queryKey, (list) => list?.map((item) => (item.provider === provider ? update(item) : item)));
    return { previous };
  };

  const rollback = (error: unknown, _variables: unknown, context?: { previous?: AiIntegration[] }) => {
    queryClient.setQueryData(queryKey, context?.previous);
    showAiIntegrationError(error);
  };

  const upsert = useMutation({
    mutationFn: (body: UpsertAiIntegrationRequestBody) => aiIntegrationService.upsert({ params: { clientId, provider }, body }),
    onSuccess: setIntegration,
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => aiIntegrationService.toggle({ params: { clientId, provider }, enabled }),
    onMutate: (enabled) => optimistic((item) => ({ ...item, enabled })),
    onError: rollback,
    onSuccess: setIntegration,
  });

  const toggleTool = useMutation({
    mutationFn: ({ toolName, enabled }: { toolName: string; enabled: boolean }) =>
      aiIntegrationService.toggleTool({ params: { clientId, provider, toolName }, enabled }),
    onMutate: ({ toolName, enabled }) =>
      optimistic((item) => ({ ...item, tools: item.tools.map((tool) => (tool.name === toolName ? { ...tool, enabled } : tool)) })),
    onError: rollback,
    onSuccess: setIntegration,
  });

  const test = useMutation({
    mutationFn: () => aiIntegrationService.test({ params: { clientId, provider } }),
  });

  const remove = useMutation({
    mutationFn: () => aiIntegrationService.delete({ params: { clientId, provider } }),
    onError: showAiIntegrationError,
    onSuccess: () => {
      queryClient.setQueryData<AiIntegration[]>(queryKey, (list) => list?.filter((item) => item.provider !== provider));
    },
  });

  return { upsert, toggle, toggleTool, test, remove };
};
