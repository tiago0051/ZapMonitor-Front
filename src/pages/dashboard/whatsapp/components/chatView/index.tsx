import { useUserContext } from "@/context/UserContext/userContext";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { isBefore } from "date-fns";
import { DialogSendTemplate } from "./dialogSendTemplate";
import { MessageItem } from "./components/messageItem";
import { CreateMessageBar } from "./components/createMessageBar";
import { useContactMessages } from "./hooks/useContactMessages";

type ChatViewProps = {
  contact: WhatsappContactMessage;
};

export const ChatView = ({ contact }: ChatViewProps) => {
  const { socket, isConnected } = useSocketContext();
  const { user } = useUserContext();

  const { onScrollChat, isFetching, messages } = useContactMessages({
    contact,
  });

  useEffect(() => {
    if (user) {
      socket.emit("chat:subscribe", user.id, contact.id);
    }
    return () => {
      socket.emit("chat:unsubscribe", contact.id);
    };
  }, [user, contact, isConnected]);

  return (
    <div className={"grid h-full grid-rows-[auto_min-content] overflow-hidden pt-4"}>
      <div onScroll={onScrollChat} className="flex max-h-full flex-col-reverse gap-2 overflow-auto px-4">
        {messages.map((message) => (
          <MessageItem contact={contact} message={message} key={message.id} />
        ))}

        {isFetching &&
          new Array(3).fill({}).map((_v, index) => (
            <div key={index} data-my={index % 2 === 0} className="bg-secondary w-5/6 shrink-0 rounded-sm p-2 data-[my=true]:self-end">
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
      </div>

      {/* {contactService.canBeSentMessage && <CreateMessageBar contact={contact} />}

      {isReplyTimeExpired && !contactService.canBeSentMessage && (
        <div className="w-full pt-2">
          <DialogSendTemplate contactService={contactService} whatsappConfigurationId={whatsappConfigurationId} />
        </div>
      )} */}
    </div>
  );
};
