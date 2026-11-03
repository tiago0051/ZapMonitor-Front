import { useUserContext } from "@/context/UserContext/userContext";
import { useEffect, useState } from "react";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { Header } from "./components/header";
import { MessageList } from "./components/messageList";
import { CreateMessageBar } from "./components/createMessageBar";
import { useContactService } from "./hooks/useContactService";
import { useServiceActions } from "./hooks/useServiceActions";
import { isBefore } from "date-fns";
import { DialogSendTemplate } from "./components/dialogSendTemplate";
import { ReplyBlockedNotice } from "./components/replyBlockedNotice";

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
  const serviceActions = useServiceActions({ contact, contactService, onServiceAssumed });

  const [replyingTo, setReplyingTo] = useState<WhatsappMessage | null>(null);
  const [prevContactId, setPrevContactId] = useState(contact.id);

  if (contact.id !== prevContactId) {
    setPrevContactId(contact.id);
    setReplyingTo(null);
  }

  useEffect(() => {
    if (user && isConnected) {
      socket.emit("chat:subscribe", contact.id);
    }
    return () => {
      if (isConnected) socket.emit("chat:unsubscribe", contact.id);
    };
  }, [user, contact, isConnected, socket]);

  const isReplyTimeExpired = contact.replyTimeExpiredAt ? isBefore(new Date(contact.replyTimeExpiredAt), new Date()) : false;
  const canSendMessage = !!contactService?.canBeSentMessage && !isReplyTimeExpired;

  return (
    <div className={"flex h-full flex-col overflow-hidden"}>
      <Header contact={contact} contactService={contactService} serviceActions={serviceActions} onBack={onBack} onShowInfo={onShowInfo} />
      <MessageList contact={contact} onReply={canSendMessage ? setReplyingTo : undefined} />

      {canSendMessage && (
        <div className="px-4 pb-3">
          <CreateMessageBar contact={contact} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} />
        </div>
      )}
      {contactService && isReplyTimeExpired && (
        <div className="flex flex-col gap-2 px-4 pt-2 pb-3">
          <p className="text-muted-foreground text-center text-sm">
            O prazo para responder livremente este contato acabou. Envie um template para retomar a conversa.
          </p>
          <DialogSendTemplate contactService={contactService} whatsappConfigurationId={contact.whatsappConfigurationId} />
        </div>
      )}
      {contactService && !canSendMessage && !isReplyTimeExpired && (
        <div className="px-4 pt-2 pb-3">
          <ReplyBlockedNotice contactService={contactService} serviceActions={serviceActions} />
        </div>
      )}
    </div>
  );
};
