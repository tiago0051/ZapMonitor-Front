import { Badge } from "@/components/ui/badge";
import { formatAcronym } from "@/utils/formatString";
import parsePhoneNumberFromString from "libphonenumber-js";
import { useEffect, useState, type FC } from "react";
import { WhatsappChatContactMessage } from "../../components/whatsappChatContactMessage";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { socket } from "@/services/socket/socket";
import { useWhatsappContext } from "../../whatsappLayout";

type WhatsappChatItemProps = {
  isSelected: boolean;
  onClick?: () => void;
  usersInContact: User[];
  contactMessage: WhatsappContactMessage;
};

export const WhatsappChatItem: FC<WhatsappChatItemProps> = ({
  isSelected,
  onClick,
  usersInContact,
  contactMessage: contactMessageDefault,
}) => {
  const { playSound } = useWhatsappContext();

  const [contactMessage, setContactMessage] = useState<WhatsappContactMessage>(contactMessageDefault);

  const isIncoming = contactMessage.messageType === WhatsappMessageType.INCOMING;
  const parsedPhoneNumber = parsePhoneNumberFromString(contactMessage.phoneNumber);

  useEffect(() => {
    socket.on(`contact:${contactMessage.id}`, (data: WhatsappContactMessage) => {
      if (data.isRead === false) playSound();

      setContactMessage(data);
    });

    return () => {
      socket.off(`contact:${contactMessage.id}`);
    };
  }, [contactMessage, playSound]);

  return (
    <div
      data-selected={isSelected}
      className="bg-background data-[selected=true]:bg-primary/15 relative flex cursor-pointer justify-between gap-4 border-b py-2 pr-2 hover:brightness-125"
      onClick={onClick}
    >
      <div className="grid">
        <h3 className="font-bold">{contactMessage.name || parsedPhoneNumber?.formatNational()}</h3>
        <div className="flex flex-wrap gap-1">
          {contactMessage.categories.map((category) => (
            <Badge key={category.id}>{category.name}</Badge>
          ))}
        </div>
        <WhatsappChatContactMessage isIncoming={isIncoming} messageContentType={contactMessage.messageContentType}>
          {contactMessage.messageContent}
        </WhatsappChatContactMessage>
      </div>

      <div className="grid h-full grid-rows-2">
        {contactMessage.isRead === false && <div className="bg-primary h-2 w-2 self-start justify-self-end rounded-full"></div>}
        <div className="row-start-2 flex flex-wrap justify-end gap-1 self-end justify-self-end align-bottom">
          {usersInContact.map((user) => (
            <div
              className="bg-secondary text-secondary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs uppercase"
              key={user.id}
            >
              <span>{formatAcronym(user.name)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
