import { Badge } from "@/components/ui/badge";
import { formatAcronym } from "@/utils/formatString";
import parsePhoneNumberFromString from "libphonenumber-js";
import type { FC } from "react";
import { WhatsappChatContactMessage } from "../../components/whatsappChatContactMessage";

type WhatsappChatItemProps = {
  isRead?: boolean;
  isSelected: boolean;
  name?: string;
  phoneNumber: string;
  messageContent?: string;
  messageContentType?: string;
  categories: WhatsappMessageCategory[];
  onClick?: () => void;
  usersInContact: User[];
  isIncoming: boolean;
};

export const WhatsappChatItem: FC<WhatsappChatItemProps> = ({
  isSelected,
  isRead,
  name,
  phoneNumber,
  categories,
  messageContent,
  messageContentType,
  onClick,
  usersInContact,
  isIncoming,
}) => {
  const parsedPhoneNumber = parsePhoneNumberFromString(phoneNumber);

  return (
    <div
      data-selected={isSelected}
      className="bg-background data-[selected=true]:bg-primary/15 relative flex cursor-pointer justify-between gap-4 border-b py-2 pr-2 hover:brightness-125"
      onClick={onClick}
    >
      <div className="grid">
        <h3 className="font-bold">{name || parsedPhoneNumber?.formatNational()}</h3>
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => (
            <Badge key={category.id}>{category.name}</Badge>
          ))}
        </div>
        <WhatsappChatContactMessage isIncoming={isIncoming} messageContentType={messageContentType}>
          {messageContent}
        </WhatsappChatContactMessage>
      </div>

      <div className="grid h-full grid-rows-2">
        {isRead === false && <div className="bg-primary h-2 w-2 self-start justify-self-end rounded-full"></div>}
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
