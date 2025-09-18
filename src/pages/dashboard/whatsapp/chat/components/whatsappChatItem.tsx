import { Badge } from "@/components/ui/badge";
import { formatAcronym } from "@/utils/formatString";
import type { FC } from "react";

type WhatsappChatItemProps = {
  isRead?: boolean;
  isSelected: boolean;
  name?: string;
  messageContent?: string;
  categories: WhatsappMessageCategory[];
  onClick?: () => void;
  usersInContact: User[];
  isIncomming: boolean;
};

export const WhatsappChatItem: FC<WhatsappChatItemProps> = ({
  isSelected,
  isRead,
  name,
  categories,
  messageContent,
  onClick,
  usersInContact,
  isIncomming,
}) => {
  return (
    <div
      data-selected={isSelected}
      className="py-2 pr-2 border-b cursor-pointer bg-background hover:brightness-125 relative data-[selected=true]:bg-primary/15 flex justify-between gap-4"
      onClick={onClick}
    >
      <div className="grid">
        <h3 className="font-bold">{name}</h3>
        <div className="flex gap-1 flex-wrap">
          {categories.map((category) => (
            <Badge key={category.id}>{category.name}</Badge>
          ))}
        </div>
        <p
          data-incomming={isIncomming}
          className="text-sm text-foreground/50 data-[incomming=true]:font-bold data-[incomming=true]:text-foreground/80 truncate"
        >
          {messageContent}
        </p>
      </div>

      <div className="grid grid-rows-2 h-full">
        {isRead === false && (
          <div className="w-2 h-2 rounded-full bg-primary self-start justify-self-end"></div>
        )}
        <div className="self-end row-start-2 flex gap-1 flex-wrap justify-end justify-self-end align-bottom">
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
