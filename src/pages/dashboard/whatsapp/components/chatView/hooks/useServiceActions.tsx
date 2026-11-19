import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { markSelfAssigned } from "../../../notifications/selfAssignedContacts";

interface UseServiceActionsProps {
  // Só o id é usado: a Gestão transfere sem ter a conversa carregada
  contact: Pick<WhatsappContactMessage, "id">;
  contactService?: WhatsappContactService;
  onServiceAssumed?: () => void;
  // Depois de passar o atendimento para outra pessoa ou grupo
  onTransferred?: () => void;
}

type OptimisticContext = { previousContactService?: WhatsappContactService };

/** Ações sobre o atendimento do contato, compartilhadas pelo cabeçalho e pela barra de mensagem do chat. */
export const useServiceActions = ({ contact, contactService, onServiceAssumed, onTransferred }: UseServiceActionsProps) => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const queryClient = useQueryClient();
  // Encerrado nesta tela: em vez de "Assumir atendimento", mostra o caminho para a próxima conversa
  const [hasJustEnded, setHasJustEnded] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

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
    onMutate: () => {
      setHasJustEnded(true);
      // Ninguém está atendendo; assumir de novo só depois que o servidor confirmar
      return applyOptimisticContactService({
        canBeServiceStarted: false,
        canBeServiceTransferred: false,
        canBeServiceEnded: false,
        canBeForwarded: false,
        isInService: false,
        canBeSentMessage: false,
      });
    },
    onSuccess: invalidateContactService,
    onError: (error, variables, context) => {
      setHasJustEnded(false);
      rollbackContactService(error, variables, context);
    },
  });

  // Passar para outra pessoa ou grupo: quem transferiu deixa de poder responder na hora
  const transferredAwayUpdate: Partial<WhatsappContactService> = {
    canBeServiceStarted: false,
    canBeServiceTransferred: false,
    canBeServiceEnded: false,
    canBeForwarded: false,
    canBeSentMessage: false,
    canBeTransferredToOthers: false,
  };

  const transferToUserMutation = useMutation({
    mutationFn: (variables: TransferWhatsappServiceRequestData & { userName: string }) => whatsappService.transferService(variables),
    onMutate: () => applyOptimisticContactService(transferredAwayUpdate),
    onSuccess: (_data, variables) => {
      toast.success(`Atendimento transferido para ${variables.userName}`);
      invalidateContactService();
      onTransferred?.();
    },
    onError: rollbackContactService,
  });

  const transferToGroupMutation = useMutation({
    mutationFn: (variables: TransferWhatsappServiceToGroupRequestData & { groupName: string }) =>
      whatsappService.transferServiceToGroup(variables),
    onMutate: () => applyOptimisticContactService(transferredAwayUpdate),
    onSuccess: (_data, variables) => {
      toast.success(`Contato enviado para a fila do grupo ${variables.groupName}`);
      invalidateContactService();
      onTransferred?.();
    },
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
    markSelfAssigned(contact.id);
    setHasJustEnded(false);

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

  function transferToUser(target: { id: string; name: string }, note?: string) {
    transferToUserMutation.mutate({
      params: { contactId: contact.id, userId: target.id, clientId: client.id },
      body: { note },
      userName: target.name,
    });
  }

  function transferToGroup(target: { id: string; name: string }, note?: string) {
    transferToGroupMutation.mutate({
      params: { contactId: contact.id, serviceGroupId: target.id, clientId: client.id },
      body: { note },
      groupName: target.name,
    });
  }

  function endService(body?: EndWhatsappServiceRequestBody) {
    endServiceMutation.mutate({ params: { contactId: contact.id, clientId: client.id }, body });
  }

  return {
    // Se alguém assumir o contato de novo, o aviso de encerrado deixa de valer
    hasJustEnded: hasJustEnded && !contactService?.isInService,
    canAssumeService: !!(contactService?.canBeServiceStarted || contactService?.canBeServiceTransferred),
    isPending:
      startServiceMutation.isPending ||
      transferServiceMutation.isPending ||
      endServiceMutation.isPending ||
      transferToUserMutation.isPending ||
      transferToGroupMutation.isPending ||
      forwardServiceMutation.isPending,
    assumeService,
    endService,
    isEndDialogOpen,
    setIsEndDialogOpen,
    canTransferToOthers: !!contactService?.canBeTransferredToOthers,
    transferToUser,
    transferToGroup,
    isTransferDialogOpen,
    setIsTransferDialogOpen,
    forwardService,
  };
};

export type ServiceActions = ReturnType<typeof useServiceActions>;
