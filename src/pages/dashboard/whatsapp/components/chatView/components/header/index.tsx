import { ContactAvatar } from "@/components/contact-avatar";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { formatPhoneNumber } from "@/utils/formatString";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Forward, Info, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FC } from "react";
import { toast } from "sonner";

interface HeaderProps {
  contact: WhatsappContactMessage;
  contactService?: WhatsappContactService;
  onServiceAssumed?: () => void;
  onBack?: () => void;
  onShowInfo?: () => void;
}

export const Header: FC<HeaderProps> = ({ contact, contactService, onServiceAssumed, onBack, onShowInfo }) => {
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

  type OptimisticContext = { previousContactService?: WhatsappContactService };

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

  function handleForwardService(outputId: string) {
    forwardServiceMutation.mutate({ params: { contactId: contact.id, outputId, clientId: client.id } });
  }

  function handleAssumeService() {
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

  function handleEndService() {
    endServiceMutation.mutate({ params: { contactId: contact.id, clientId: client.id } });
  }

  const canAssumeService = contactService?.canBeServiceStarted || contactService?.canBeServiceTransferred;
  const isServiceMutationPending =
    startServiceMutation.isPending || transferServiceMutation.isPending || endServiceMutation.isPending || forwardServiceMutation.isPending;

  return (
    <header className="bg-card border-border flex flex-shrink-0 items-center gap-1.5 border-b px-2 py-2.5 sm:gap-2 sm:px-3 sm:py-3 md:px-5">
      {/* Back button — mobile only */}
      <button
        className="hover:bg-muted text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <ContactAvatar contact={contact} />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold">{contact.name}</p>
        <p className="text-muted-foreground text-xs">{formatPhoneNumber(contact.phoneNumber)}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {canAssumeService && (
          <button
            onClick={handleAssumeService}
            disabled={isServiceMutationPending}
            className="rounded-lg bg-green-50 px-2 py-1.5 text-xs font-medium whitespace-nowrap text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50 sm:px-3"
          >
            Assumir
          </button>
        )}
        {contactService?.canBeForwarded && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isServiceMutationPending}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-medium whitespace-nowrap text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 sm:px-3"
              >
                <Forward className="h-3.5 w-3.5" />
                Encaminhar
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Próxima etapa do fluxo</DropdownMenuLabel>
              {contactService.flowOutputs.map((output) => (
                <DropdownMenuItem key={output.id} onSelect={() => handleForwardService(output.id)}>
                  {output.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {contactService?.canBeServiceEnded && (
          <button
            onClick={handleEndService}
            disabled={isServiceMutationPending}
            className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium whitespace-nowrap text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 sm:px-3"
          >
            Encerrar
          </button>
        )}
        {/* Info button — mobile only */}
        <button
          className="hover:bg-muted text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
          onClick={onShowInfo}
        >
          <Info className="h-4 w-4" />
        </button>
        <button className="hover:bg-muted text-muted-foreground hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:flex">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
