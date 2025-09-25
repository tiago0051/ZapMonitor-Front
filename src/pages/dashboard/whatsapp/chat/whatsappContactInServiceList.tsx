import { useQuery } from "@tanstack/react-query";
import { WhatsappChatItem } from "./components/whatsappChatItem";
import { whatsappService } from "@/services/api/whatsappService";
import type { FC } from "react";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";

type WhatsappContactInServiceListProps = {
  contactSelected: WhatsappContactMessage | null;
  setContactSelected: (contact: WhatsappContactMessage) => void;
  usersInContacts: Record<string, User[]>;
};

export const WhatsappContactInServiceList: FC<WhatsappContactInServiceListProps> = ({
  contactSelected,
  setContactSelected,
  usersInContacts,
}) => {
  const findAllContactMessagesInServiceByUser = useQuery({
    queryKey: ["chat:update", "findAllContactMessagesInServiceByUser"],
    queryFn: () => whatsappService.findAllContactMessagesInServiceByUser(),
  });

  const contactMessagesInService = findAllContactMessagesInServiceByUser.data || [];

  const isEmpty = contactMessagesInService.length === 0;

  return (
    <div>
      {contactMessagesInService?.map((contactMessage) => (
        <WhatsappChatItem
          isSelected={contactSelected?.id === contactMessage.id}
          isRead={contactMessage.isRead}
          name={contactMessage.name}
          phoneNumber={contactMessage.phoneNumber}
          categories={contactMessage.categories}
          messageContent={contactMessage.messageContent}
          messageContentType={contactMessage.messageContentType}
          onClick={() => setContactSelected(contactMessage)}
          key={contactMessage.id}
          usersInContact={usersInContacts[contactMessage.id] || []}
          isIncoming={contactMessage.messageType === WhatsappMessageType.INCOMING}
        />
      ))}

      {isEmpty && <div className="text-muted-foreground text-center text-sm">Nenhuma mensagem em atendimento</div>}
    </div>
  );
};
