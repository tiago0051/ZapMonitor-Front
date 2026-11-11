import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { WhatsappServiceStatus } from "@/enums/whatsappServiceStatus.enum";
import { whatsappCallService } from "@/services/api/whatsappCallService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Phone } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { useCallContext } from "./callContext";

type CallButtonProps = { contact: WhatsappContactMessage };

/**
 * Liga para o contato pelo número da conversa. Sem autorização do contato, oferece mandar o pedido para ligar.
 * Só aparece quando o número tem as ligações ligadas.
 */
export const CallButton: FC<CallButtonProps> = ({ contact }) => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const { canUseCalls, activeCall, startCall } = useCallContext();
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
    enabled: canUseCalls,
    staleTime: 5 * 60 * 1000,
  });

  const configuration = configurationsQuery.data?.items.find((item) => item.id === contact.whatsappConfigurationId);
  const params = { clientId: client.id, contactId: contact.id, configurationId: contact.whatsappConfigurationId };
  const contactName = contact.surname?.trim() || contact.name?.trim() || contact.phoneNumber;
  const isAttending = contact.serviceStatus === WhatsappServiceStatus.HUMAN_ACTIVE && contact.userIdInService === user?.id;

  const call = useMutation({
    mutationFn: () => whatsappCallService.findAvailability({ params }),
    onError: requestErrorHandling,
    onSuccess: (availability) => {
      if (availability.canCall) {
        void startCall({ contactId: contact.id, contactName, configurationId: contact.whatsappConfigurationId });
        return;
      }

      if (availability.canRequestPermission) {
        setIsPermissionDialogOpen(true);
        return;
      }

      toast.info(availability.reason ?? "Não dá para ligar para este contato agora");
    },
  });

  const requestPermission = useMutation({
    mutationFn: () => whatsappCallService.requestPermission({ params }),
    onError: requestErrorHandling,
    onSuccess: () => toast.success("Pedido enviado. Quando o contato autorizar, é só ligar de novo"),
  });

  if (!canUseCalls || !configuration?.callingEnabled) return null;

  const isInThisCall = activeCall?.contactId === contact.id;
  const disabledReason = !isAttending
    ? "Assuma o atendimento para ligar"
    : activeCall && !isInThisCall
      ? "Encerre a ligação atual para ligar"
      : isInThisCall
        ? "Em ligação com este contato"
        : null;

  return (
    <>
      <button
        type="button"
        aria-label={`Ligar para ${contactName}`}
        title={disabledReason ?? `Ligar para ${contactName} pelo WhatsApp`}
        disabled={!!disabledReason || call.isPending}
        onClick={() => call.mutate()}
        className="hover:bg-muted text-muted-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
      >
        {call.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
      </button>

      <AlertDialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{contactName} ainda não autorizou ligações</AlertDialogTitle>
            <AlertDialogDescription>
              O WhatsApp só deixa a empresa ligar depois que o contato autoriza. Enviar o pedido? Ele aparece na conversa com os botões para
              permitir ou recusar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={requestPermission.isPending} onClick={() => requestPermission.mutate()}>
              Enviar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
