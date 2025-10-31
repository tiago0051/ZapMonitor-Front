import { Badge } from "@/components/ui/badge";
import { formatAcronym } from "@/utils/formatString";
import { type FC } from "react";
import { WhatsappChatContactMessage } from "../../components/whatsappChatContactMessage";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";

type WhatsappChatItemProps = {
  isSelected: boolean;
  onClick?: () => void;
  usersInContact: User[];
  contactMessage: WhatsappContactMessage;
};

export const WhatsappChatItem: FC<WhatsappChatItemProps> = ({ isSelected, onClick, usersInContact, contactMessage }) => {
  const isIncoming = contactMessage.messageType === WhatsappMessageType.INCOMING;

  return (
    <div
      data-selected={isSelected}
      className="bg-background data-[selected=true]:bg-primary/15 relative flex cursor-pointer justify-between gap-4 border-b py-2 pr-2 hover:brightness-125"
      onClick={onClick}
    >
      <div className="grid">
        <h3 className="font-bold">{contactMessage.surname || contactMessage.name}</h3>
        <div className="flex flex-wrap gap-1">
          {contactMessage.categories.map((category) => (
            <Badge key={category.id}>{category.name}</Badge>
          ))}
        </div>
        <WhatsappChatContactMessage isIncoming={isIncoming} messageContentType={contactMessage.messageContentType}>
          {contactMessage.messageContent}
        </WhatsappChatContactMessage>

        {contactMessage.serviceUserServiceName && (
          <p className="mt-3 text-xs">Em atendimento por: {contactMessage.serviceUserServiceName}</p>
        )}
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
