import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useState, type FC } from "react";
import { WhatsappChatMessageList } from "../../components/whatsappChatMessageList";
import { WhatsappChatMessageHeader } from "../../components/whatsappChatMessageList/whatsappChatMessageHeader";
import { useMutation, useQuery } from "@tanstack/react-query";
import { whatsappService } from "@/services/api/whatsappService";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { requestErrorHandling } from "@/utils/request";
import { useUserContext } from "@/context/UserContext/userContext";

type DialogKanbanCardProps = {
  children?: React.ReactNode;
  contactMessage: WhatsappContactMessage;
};

export const DialogKanbanCard: FC<DialogKanbanCardProps> = ({ children, contactMessage }) => {
  const { user } = useUserContext();

  const [isOpen, setIsOpen] = useState(false);

  const findContactServiceByContact = useQuery({
    queryKey: [`contact-${contactMessage.id}`, "findContactServiceByContact"],
    queryFn: async () =>
      await whatsappService.findContactServiceByContact({
        params: {
          contactId: contactMessage.id,
        },
      }),
    enabled: isOpen,
  });

  const contactService = findContactServiceByContact.data;

  const startServiceMutation = useMutation({
    mutationFn: whatsappService.startService,
    onSuccess: () => {
      toast.success("Atendimento iniciado com sucesso");
    },
    onError: requestErrorHandling,
  });

  const transferServiceMutation = useMutation({
    mutationFn: whatsappService.transferService,
    onSuccess: () => {
      toast.success("Atendimento transferido com sucesso");
    },
    onError: requestErrorHandling,
  });

  const endServiceMutation = useMutation({
    mutationFn: whatsappService.endService,
    onSuccess: () => {
      toast.success("Atendimento finalizado com sucesso");
    },
    onError: requestErrorHandling,
  });

  const isLoading = startServiceMutation.isPending || transferServiceMutation.isPending || endServiceMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="grid max-h-[90dvh] grid-rows-[min-content_1fr] overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Detalhes do contato</DialogTitle>
          <DialogDescription>Informações detalhadas sobre o contato selecionado.</DialogDescription>
        </DialogHeader>

        {contactService && (
          <div className="grid grid-rows-[min-content_auto_min-content] gap-4 overflow-hidden">
            <WhatsappChatMessageHeader contactMessage={contactMessage} className="w-full" />
            <WhatsappChatMessageList whatsappConfigurationId={contactMessage.whatsappConfigurationId} contactService={contactService} />
            <div className="flex flex-col gap-2 [&>button]:w-full">
              {contactService?.canBeServiceEnded && (
                <Button
                  disabled={isLoading}
                  onClick={() =>
                    endServiceMutation.mutate({
                      params: { contactId: contactService.id },
                    })
                  }
                >
                  Finalizar atendimento
                </Button>
              )}
              {contactService?.canBeServiceStarted && (
                <Button
                  disabled={isLoading}
                  onClick={() =>
                    startServiceMutation.mutate({
                      params: {
                        contactId: contactService.id,
                      },
                    })
                  }
                >
                  Iniciar atendimento
                </Button>
              )}
              {contactService?.canBeServiceTransferred && (
                <Button
                  disabled={isLoading}
                  onClick={() =>
                    transferServiceMutation.mutate({
                      params: {
                        contactId: contactService.id,
                        userId: user!.id,
                      },
                    })
                  }
                >
                  Assumir atendimento
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
