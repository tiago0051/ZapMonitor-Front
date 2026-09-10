import { ContactAvatar } from "@/components/contact-avatar";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { formatPhoneNumber } from "@/utils/formatString";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Info, MoreHorizontal } from "lucide-react";
import type { FC } from "react";

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

  const invalidateContactService = () => {
    queryClient.invalidateQueries({ queryKey: [`contact-${contact.id}`, "findContactServiceByContact", contact.id] });
    queryClient.invalidateQueries({ queryKey: [`contact-${contact.id}`, "findAllServiceHistoryByContact"] });
    queryClient.invalidateQueries({ queryKey: ["whatsapp", "contactsStats"] });
    queryClient.invalidateQueries({ queryKey: ["whatsapp", "contacts"] });
  };

  const handleServiceAssumedSuccess = () => {
    invalidateContactService();
    onServiceAssumed?.();
  };

  const startServiceMutation = useMutation({
    mutationFn: whatsappService.startService,
    onSuccess: handleServiceAssumedSuccess,
    onError: requestErrorHandling,
  });

  const transferServiceMutation = useMutation({
    mutationFn: whatsappService.transferService,
    onSuccess: handleServiceAssumedSuccess,
    onError: requestErrorHandling,
  });

  const endServiceMutation = useMutation({
    mutationFn: whatsappService.endService,
    onSuccess: invalidateContactService,
    onError: requestErrorHandling,
  });

  function handleAssumeService() {
    if (contactService?.canBeServiceStarted) {
      startServiceMutation.mutate({ params: { contactId: contact.id, clientId: client.id } });
      return;
    }

    if (contactService?.canBeServiceTransferred && user) {
      transferServiceMutation.mutate({ params: { contactId: contact.id, userId: user.id, clientId: client.id } });
    }
  }

  function handleEndService() {
    endServiceMutation.mutate({ params: { contactId: contact.id, clientId: client.id } });
  }

  const canAssumeService = contactService?.canBeServiceStarted || contactService?.canBeServiceTransferred;
  const assumeServicePending = startServiceMutation.isPending || transferServiceMutation.isPending;

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
            disabled={assumeServicePending}
            className="rounded-lg bg-green-50 px-2 py-1.5 text-xs font-medium whitespace-nowrap text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50 sm:px-3"
          >
            Assumir
          </button>
        )}
        {contactService?.canBeServiceEnded && (
          <button
            onClick={handleEndService}
            disabled={endServiceMutation.isPending}
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
