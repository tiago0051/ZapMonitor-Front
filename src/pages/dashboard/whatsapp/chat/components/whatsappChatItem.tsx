import { Badge } from "@/components/ui/badge";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { formatAcronym } from "@/utils/formatString";
import type { FC, ReactNode } from "react";
import { FiFile, FiImage, FiMic, FiUser, FiVideo } from "react-icons/fi";
import type { IconType } from "react-icons/lib";

type WhatsappChatItemProps = {
  isRead?: boolean;
  isSelected: boolean;
  name?: string;
  messageContent?: string;
  messageContentType?: string;
  categories: WhatsappMessageCategory[];
  onClick?: () => void;
  usersInContact: User[];
  isIncomming: boolean;
};

const MessageContent = ({
  children,
  isIncomming,
  icon: Icon,
}: {
  children: ReactNode;
  isIncomming: boolean;
  icon?: IconType;
}) => (
  <div className="grid items-center gap-1 grid-cols-[min-content_1fr]">
    {Icon && <Icon size={14} />}
    <p
      data-incomming={isIncomming}
      className="text-sm text-foreground/50 data-[incomming=true]:font-bold data-[incomming=true]:text-foreground/80 truncate col-start-2"
    >
      {children}
    </p>
  </div>
);

export const WhatsappChatItem: FC<WhatsappChatItemProps> = ({
  isSelected,
  isRead,
  name,
  categories,
  messageContent,
  messageContentType,
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
        {messageContentType === WhatsappMessageContentType.TEXT && (
          <MessageContent isIncomming={isIncomming}>
            {messageContent}
          </MessageContent>
        )}
        {messageContentType === WhatsappMessageContentType.AUDIO && (
          <MessageContent isIncomming={isIncomming} icon={FiMic}>
            {messageContent}
          </MessageContent>
        )}
        {messageContentType === WhatsappMessageContentType.CONTACTS && (
          <MessageContent isIncomming={isIncomming} icon={FiUser}>
            {messageContent}
          </MessageContent>
        )}
        {messageContentType === WhatsappMessageContentType.DOCUMENT && (
          <MessageContent isIncomming={isIncomming} icon={FiFile}>
            {messageContent}
          </MessageContent>
        )}
        {messageContentType === WhatsappMessageContentType.IMAGE && (
          <MessageContent isIncomming={isIncomming} icon={FiImage}>
            {messageContent}
          </MessageContent>
        )}
        {messageContentType === WhatsappMessageContentType.VIDEO && (
          <MessageContent isIncomming={isIncomming} icon={FiVideo}>
            {messageContent}
          </MessageContent>
        )}
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
