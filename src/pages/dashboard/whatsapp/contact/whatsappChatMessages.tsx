import { whatsappService } from "@/services/api/whatsappService";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { WhatsappChatMessageHeader } from "../components/whatsappChatMessageList/whatsappChatMessageHeader";
import { WhatsappChatMessageList } from "../components/whatsappChatMessageList";
import { WhatsappChatMessageListService } from "../components/whatsappChatMessageList/whatsappChatMessageListService/whatsappChatMessageListService";
import { useClientContext } from "@/context/ClientContext/clientContext";

type WhatsappChatMessagesProps = {
  contactMessage: WhatsappContactMessage;
  onBack: () => void;
  className?: string;
};

export const WhatsappChatMessages = ({ contactMessage, onBack, className }: WhatsappChatMessagesProps) => {
  const { client } = useClientContext();

  const findContactServiceByContact = useSuspenseQuery({
    queryKey: [`contact-${contactMessage.id}`, "findContactServiceByContact"],
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
    <div className={cn(className, "grid grid-cols-4 grid-rows-[min-content_auto]")}>
      <WhatsappChatMessageHeader contactMessage={contactMessage} onBack={onBack} className="col-span-6" />

      <WhatsappChatMessageList
        className="col-span-3"
        contactService={contactService}
        whatsappConfigurationId={contactMessage.whatsappConfigurationId}
      />

      <WhatsappChatMessageListService contactService={contactService} />
    </div>
  );
};
