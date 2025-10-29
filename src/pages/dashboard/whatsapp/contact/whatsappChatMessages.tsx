import { whatsappService } from "@/services/api/whatsappService";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { WhatsappChatMessageHeader } from "../components/whatsappChatMessageList/whatsappChatMessageHeader";
import { WhatsappChatMessageList } from "../components/whatsappChatMessageList";
import { WhatsappChatMessageListService } from "../components/whatsappChatMessageList/whatsappChatMessageListService/whatsappChatMessageListService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useIsMobile } from "@/hooks/use-mobile.ts";

type WhatsappChatMessagesProps = {
  contactMessage: WhatsappContactMessage;
  className?: string;
};

export const WhatsappChatMessages = ({ contactMessage, className }: WhatsappChatMessagesProps) => {
  const isMobile = useIsMobile();
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
    <div className={cn(className, "grid md:grid-cols-4 grid-rows-[min-content_auto] overflow-hidden")}>
      <WhatsappChatMessageHeader contactMessage={contactMessage} className="md:col-span-4" />

      <WhatsappChatMessageList
        className="md:col-span-3"
        contactService={contactService}
        whatsappConfigurationId={contactMessage.whatsappConfigurationId}
      />

      {!isMobile && <WhatsappChatMessageListService contactService={contactService} />}
    </div>
  );
};
