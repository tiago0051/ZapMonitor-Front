import { Badge } from "@/components/ui/badge";
import { formatAcronym } from "@/utils/formatString";
import { type DetailedHTMLProps, type FC } from "react";
import { WhatsappChatContactMessage } from "../../components/whatsappChatContactMessage";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type WhatsappKanbanItemProps = DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  isSelected: boolean;
  usersInContact: User[];
  contactMessage: WhatsappContactMessage;
};

export const WhatsappKanbanItem: FC<WhatsappKanbanItemProps> = ({
  isSelected,
  onClick,
  usersInContact,
  contactMessage,
  className,
  ...props
}) => {
  const isIncoming = contactMessage.messageType === WhatsappMessageType.INCOMING;

  return (
    <div
      className={cn(className, "bg-background cursor-pointer gap-4 overflow-hidden border-b py-2 pr-2 hover:brightness-125", {
        "bg-primary/15": isSelected,
      })}
      onClick={onClick}
      {...props}
    >
      <div className="flex w-full items-center justify-between">
        <h3 className="font-bold">{contactMessage.surname || contactMessage.name}</h3>
        {contactMessage.isRead === false && <div className="bg-primary h-2 w-2 rounded-full"></div>}
      </div>
      <div className="flex flex-wrap gap-1">
        {contactMessage.categories.map((category) => (
          <Badge key={category.id}>{category.name}</Badge>
        ))}
      </div>
      <div className="flex w-full justify-between">
        <WhatsappChatContactMessage isIncoming={isIncoming} messageContentType={contactMessage.messageContentType}>
          {contactMessage.messageContent}
        </WhatsappChatContactMessage>
        <span className="text-xs whitespace-nowrap">{format(contactMessage.messageCreatedAt, "dd/MM/yy HH:mm")}</span>
      </div>

      <div className="mt-3 grid grid-cols-[auto_44px]">
        {contactMessage.serviceUserServiceName && <p className="text-xs">Em atendimento por: {contactMessage.serviceUserServiceName}</p>}
        <div className="col-start-2 flex flex-wrap justify-end gap-1">
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
