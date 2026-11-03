import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UseServiceActionsProps {
  contact: WhatsappContactMessage;
  contactService?: WhatsappContactService;
  onServiceAssumed?: () => void;
}

type OptimisticContext = { previousContactService?: WhatsappContactService };

/** Ações sobre o atendimento do contato, compartilhadas pelo cabeçalho e pela barra de mensagem do chat. */
export const useServiceActions = ({ contact, contactService, onServiceAssumed }: UseServiceActionsProps) => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const queryClient = useQueryClient();

  const contactServiceQueryKey = [`contact-${contact.id}`, "findContactServiceByContact", contact.id];

  const invalidateContactService = () => {
    queryClient.invalidateQueries({ queryKey: contactServiceQueryKey });
    queryClient.invalidateQueries({ queryKey: [`contact-${contact.id}`, "findAllServiceHistoryByContact"] });
    queryClient.invalidateQueries({ queryKey: ["whatsapp", "contactsStats"] });
    queryClient.invalidateQueries({ queryKey: ["whatsapp", "contacts"] });
  };

  const handleServiceAssumedSuccess = () => {
    invalidateContactService();
    onServiceAssumed?.();
  };

  const applyOptimisticContactService = async (update: Partial<WhatsappContactService>): Promise<OptimisticContext> => {
    // Cancela refetches em andamento (ex.: disparados pelo socket) para não sobrescreverem a atualização otimista
    await queryClient.cancelQueries({ queryKey: contactServiceQueryKey });

    const previousContactService = queryClient.getQueryData<WhatsappContactService>(contactServiceQueryKey);

    if (previousContactService) {
      queryClient.setQueryData<WhatsappContactService>(contactServiceQueryKey, { ...previousContactService, ...update });
    }

    return { previousContactService };
  };

  const rollbackContactService = (error: unknown, _variables: unknown, context?: OptimisticContext) => {
    if (context?.previousContactService) {
      queryClient.setQueryData(contactServiceQueryKey, context.previousContactService);
    }
    requestErrorHandling(error);
  };

  const startServiceMutation = useMutation({
    mutationFn: whatsappService.startService,
    onMutate: () =>
      applyOptimisticContactService({
        canBeServiceStarted: false,
        canBeServiceTransferred: false,
        canBeServiceEnded: true,
        isInService: true,
        canBeSentMessage: true,
      }),
    onSuccess: handleServiceAssumedSuccess,
    onError: rollbackContactService,
  });

  const transferServiceMutation = useMutation({
    mutationFn: whatsappService.transferService,
    onMutate: () =>
      applyOptimisticContactService({
        canBeServiceStarted: false,
        canBeServiceTransferred: false,
        canBeServiceEnded: true,
        isInService: true,
        canBeSentMessage: true,
      }),
    onSuccess: handleServiceAssumedSuccess,
    onError: rollbackContactService,
  });

  const endServiceMutation = useMutation({
    mutationFn: whatsappService.endService,
    onMutate: () =>
      applyOptimisticContactService({
        canBeServiceStarted: true,
        canBeServiceTransferred: false,
        canBeServiceEnded: false,
        isInService: false,
        canBeSentMessage: false,
      }),
    onSuccess: invalidateContactService,
    onError: rollbackContactService,
  });

  const forwardServiceMutation = useMutation({
    mutationFn: whatsappService.forwardService,
    onMutate: () => applyOptimisticContactService({ canBeForwarded: false, canBeSentMessage: false, canBeServiceEnded: false }),
    onSuccess: () => {
      toast.success("Contato encaminhado para a próxima etapa");
      invalidateContactService();
    },
    onError: rollbackContactService,
  });

  function forwardService(outputId: string) {
    forwardServiceMutation.mutate({ params: { contactId: contact.id, outputId, clientId: client.id } });
  }

  function assumeService() {
    if (contactService?.canBeServiceStarted) {
      startServiceMutation.mutate({ params: { contactId: contact.id, clientId: client.id } });
      return;
    }

    if (contactService?.canBeServiceTransferred) {
      if (!user) {
        toast.error("Usuário não carregado. Recarregue a página e tente novamente.");
        return;
      }

      transferServiceMutation.mutate({ params: { contactId: contact.id, userId: user.id, clientId: client.id } });
    }
  }

  function endService() {
    endServiceMutation.mutate({ params: { contactId: contact.id, clientId: client.id } });
  }

  return {
    canAssumeService: !!(contactService?.canBeServiceStarted || contactService?.canBeServiceTransferred),
    isPending:
      startServiceMutation.isPending ||
      transferServiceMutation.isPending ||
      endServiceMutation.isPending ||
      forwardServiceMutation.isPending,
    assumeService,
    endService,
    forwardService,
  };
};

export type ServiceActions = ReturnType<typeof useServiceActions>;
