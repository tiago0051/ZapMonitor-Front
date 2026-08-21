import { useUserContext } from "@/context/UserContext/userContext";
import { useEffect } from "react";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { Header } from "./components/header";
import { MessageList } from "./components/messageList";

type ChatViewProps = {
  contact: WhatsappContactMessage;
};

export const ChatView = ({ contact }: ChatViewProps) => {
  const { socket, isConnected } = useSocketContext();
  const { user } = useUserContext();

  useEffect(() => {
    if (user && isConnected) {
      socket.emit("chat:subscribe", user.id, contact.id);
    }
    return () => {
      if (isConnected) socket.emit("chat:unsubscribe", contact.id);
    };
  }, [user, contact, isConnected, socket]);

  return (
    <div className={"flex h-full flex-col overflow-hidden"}>
      <Header contact={contact} />
      <MessageList contact={contact} />

      {/* {contactService.canBeSentMessage && <CreateMessageBar contact={contact} />}

      {isReplyTimeExpired && !contactService.canBeSentMessage && (
        <div className="w-full pt-2">
          <DialogSendTemplate contactService={contactService} whatsappConfigurationId={whatsappConfigurationId} />
        </div>
      )} */}
    </div>
  );
};
