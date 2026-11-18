import { useState } from "react";
import { Header } from "./components/header";
import { MessageList } from "./components/messageList";
import { useContactService } from "./hooks/useContactService";
import { useServiceActions } from "./hooks/useServiceActions";
import { useChatSubscription } from "./hooks/useChatSubscription";
import { ChatComposer } from "./components/chatComposer";
import { canReplyToContact } from "./components/chatComposer/canReplyToContact";
import { TransferNoteBanner } from "./components/transferNoteBanner";
import { getDraftReply, saveDraftReply } from "../../conversationDrafts";
import { canRunScreenShortcut, isAltShiftKey, useWindowKeydown } from "../../shortcuts/keyboardShortcuts";
import { toast } from "sonner";

type ChatViewProps = {
  contact: WhatsappContactMessage;
  onServiceAssumed?: () => void;
  onBack?: () => void;
  onShowInfo?: () => void;
};

export const ChatView = ({ contact, onServiceAssumed, onBack, onShowInfo }: ChatViewProps) => {
  const { contactService } = useContactService({ contactId: contact.id });
  const serviceActions = useServiceActions({ contact, contactService, onServiceAssumed });

  // "Respondendo a" faz parte do rascunho da conversa: volta ao reabrir o contato
  const [replyingTo, setReplyingToState] = useState<WhatsappMessage | null>(() => getDraftReply(contact.id));
  const [prevContactId, setPrevContactId] = useState(contact.id);

  if (contact.id !== prevContactId) {
    setPrevContactId(contact.id);
    setReplyingToState(getDraftReply(contact.id));
  }

  const setReplyingTo = (message: WhatsappMessage | null) => {
    setReplyingToState(message);
    saveDraftReply(contact.id, message);
  };

  useChatSubscription(contact.id);

  // Alt+Shift+A assume, Alt+Shift+E encerra e Alt+Shift+T transfere (fora de campos de texto)
  useWindowKeydown((event) => {
    if (!canRunScreenShortcut(event)) return;

    if (isAltShiftKey(event, "A")) {
      event.preventDefault();
      if (serviceActions.canAssumeService && !serviceActions.isPending) serviceActions.assumeService();
      else toast.info("Não há atendimento para assumir nesta conversa");
    } else if (isAltShiftKey(event, "E")) {
      event.preventDefault();
      if (contactService?.canBeServiceEnded && !serviceActions.isPending) serviceActions.setIsEndDialogOpen(true);
      else toast.info("Só quem está atendendo pode encerrar");
    } else if (isAltShiftKey(event, "T")) {
      event.preventDefault();
      if (serviceActions.canTransferToOthers && !serviceActions.isPending) serviceActions.setIsTransferDialogOpen(true);
      else toast.info("Este atendimento não pode ser transferido por você agora");
    }
  });

  const { canSendMessage } = canReplyToContact(contact, contactService);

  return (
    <div className={"flex h-full flex-col overflow-hidden"}>
      <Header contact={contact} contactService={contactService} serviceActions={serviceActions} onBack={onBack} onShowInfo={onShowInfo} />
      {contactService?.transferNote && <TransferNoteBanner transferNote={contactService.transferNote} />}
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
