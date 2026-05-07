import { whatsappService } from "@/services/api/whatsappService";
import { useSuspenseQuery } from "@tanstack/react-query";
import { WhatsappChatMessageHeader } from "../components/whatsappChatMessageList/whatsappChatMessageHeader";
import { WhatsappChatMessageList } from "../components/whatsappChatMessageList";
import { WhatsappChatMessageListService } from "../components/whatsappChatMessageList/whatsappChatMessageListService/whatsappChatMessageListService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";

type DialogWhatsappChatProps = {
  contactMessage: WhatsappContactMessage;
};

export const DialogWhatsappChat = ({ contactMessage }: DialogWhatsappChatProps) => {
  const { client } = useClientContext();
  const { setContactSelected } = useWhatsappContext();

  const findContactServiceByContact = useSuspenseQuery({
    queryKey: [`contact-service-${contactMessage.id}`],
    queryFn: async () =>
      await whatsappService.findContactServiceByContact({
        params: {
          contactId: contactMessage.id,
          clientId: client.id,
        },
      }),
  });

  const contactService = findContactServiceByContact.data;

  return (
    <Dialog defaultOpen onOpenChange={() => setContactSelected(null)}>
      <DialogContent className="gap- grid h-[680px] max-h-[90dvh] grid-cols-3 grid-rows-[min-content_1fr] overflow-hidden p-3 md:max-w-4xl">
        <WhatsappChatMessageHeader contactMessage={contactMessage} className="col-span-3" />
        <WhatsappChatMessageList
          className="col-span-2"
          contactService={contactService}
          whatsappConfigurationId={contactMessage.whatsappConfigurationId}
        />

        <WhatsappChatMessageListService
          contactService={contactService}
          refetchContactService={() => findContactServiceByContact.refetch()}
        />
      </DialogContent>
    </Dialog>
  );
};
