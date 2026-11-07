import { useState } from "react";
import { Header } from "./components/header";
import { MessageList } from "./components/messageList";
import { useContactService } from "./hooks/useContactService";
import { useServiceActions } from "./hooks/useServiceActions";
import { useChatSubscription } from "./hooks/useChatSubscription";
import { ChatComposer } from "./components/chatComposer";
import { canReplyToContact } from "./components/chatComposer/canReplyToContact";

type ChatViewProps = {
  contact: WhatsappContactMessage;
  onServiceAssumed?: () => void;
  onBack?: () => void;
  onShowInfo?: () => void;
};

export const ChatView = ({ contact, onServiceAssumed, onBack, onShowInfo }: ChatViewProps) => {
  const { contactService } = useContactService({ contactId: contact.id });
  const serviceActions = useServiceActions({ contact, contactService, onServiceAssumed });

  const [replyingTo, setReplyingTo] = useState<WhatsappMessage | null>(null);
  const [prevContactId, setPrevContactId] = useState(contact.id);

  if (contact.id !== prevContactId) {
    setPrevContactId(contact.id);
    setReplyingTo(null);
  }

  useChatSubscription(contact.id);

  const { canSendMessage } = canReplyToContact(contact, contactService);

  return (
    <div className={"flex h-full flex-col overflow-hidden"}>
      <Header contact={contact} contactService={contactService} serviceActions={serviceActions} onBack={onBack} onShowInfo={onShowInfo} />
      <MessageList contact={contact} onReply={canSendMessage ? setReplyingTo : undefined} />
      <ChatComposer
        contact={contact}
        contactService={contactService}
        serviceActions={serviceActions}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
};
