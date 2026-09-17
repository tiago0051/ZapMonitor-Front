import { useUserContext } from "@/context/UserContext/userContext";
import { useEffect } from "react";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { Header } from "./components/header";
import { MessageList } from "./components/messageList";
import { CreateMessageBar } from "./components/createMessageBar";
import { useContactService } from "./hooks/useContactService";
import { isBefore } from "date-fns";
import { DialogSendTemplate } from "./components/dialogSendTemplate";

type ChatViewProps = {
  contact: WhatsappContactMessage;
  onServiceAssumed?: () => void;
  onBack?: () => void;
  onShowInfo?: () => void;
};

export const ChatView = ({ contact, onServiceAssumed, onBack, onShowInfo }: ChatViewProps) => {
  const { socket, isConnected } = useSocketContext();
  const { user } = useUserContext();
  const { contactService } = useContactService({ contactId: contact.id });

  useEffect(() => {
    if (user && isConnected) {
      socket.emit("chat:subscribe", contact.id);
    }
    return () => {
      if (isConnected) socket.emit("chat:unsubscribe", contact.id);
    };
  }, [user, contact, isConnected, socket]);

  const isReplyTimeExpired = contact.replyTimeExpiredAt ? isBefore(new Date(contact.replyTimeExpiredAt), new Date()) : false;

  return (
    <div className={"flex h-full flex-col overflow-hidden"}>
      <Header
        contact={contact}
        contactService={contactService}
        onServiceAssumed={onServiceAssumed}
        onBack={onBack}
        onShowInfo={onShowInfo}
      />
      <MessageList contact={contact} />

      {contactService?.canBeSentMessage && !isReplyTimeExpired && (
        <div className="px-4 pb-3">
          <CreateMessageBar contact={contact} />
        </div>
      )}
      {contactService && !contactService?.canBeSentMessage && isReplyTimeExpired && (
        <div className="w-full pt-2">
          <DialogSendTemplate contactService={contactService} whatsappConfigurationId={contact.whatsappConfigurationId} />
        </div>
      )}
    </div>
  );
};
