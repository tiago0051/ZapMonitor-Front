import { whatsappService } from "@/services/api/whatsappService";
import { useSuspenseQuery } from "@tanstack/react-query";
import { WhatsappChatMessageHeader } from "../components/whatsappChatMessageList/whatsappChatMessageHeader";
import { WhatsappChatMessageList } from "../components/whatsappChatMessageList";
import { WhatsappChatMessageListService } from "../components/whatsappChatMessageList/whatsappChatMessageListService/whatsappChatMessageListService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="grid max-h-dvh grid-cols-3 grid-rows-[min-content_100%] overflow-hidden md:max-w-4xl">
        <DialogHeader className="col-span-3">
          <DialogTitle>Chat</DialogTitle>
          <DialogDescription>Converse com o cliente</DialogDescription>
        </DialogHeader>
        <div className="col-span-2 grid max-h-full grid-rows-[min-content-100%] overflow-hidden">
          <WhatsappChatMessageHeader contactMessage={contactMessage} className="md:col-span-4" />

          <WhatsappChatMessageList
            className="md:col-span-3"
            contactService={contactService}
            whatsappConfigurationId={contactMessage.whatsappConfigurationId}
          />
        </div>

        <WhatsappChatMessageListService
          className=""
          contactService={contactService}
          refetchContactService={() => findContactServiceByContact.refetch()}
        />
      </DialogContent>
    </Dialog>
  );
};
