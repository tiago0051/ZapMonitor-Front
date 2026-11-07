import type { FC } from "react";
import type { ServiceActions } from "../../hooks/useServiceActions";
import { CreateMessageBar } from "../createMessageBar";
import { DialogSendTemplate } from "../dialogSendTemplate";
import { ReplyBlockedNotice } from "../replyBlockedNotice";
import { canReplyToContact } from "./canReplyToContact";

type ChatComposerProps = {
  contact: WhatsappContactMessage;
  contactService?: WhatsappContactService;
  serviceActions: ServiceActions;
  replyingTo: WhatsappMessage | null;
  onCancelReply: () => void;
  className?: string;
};

/**
 * Parte de baixo da conversa: a caixa de mensagem, o envio de template quando o prazo de 24h acabou ou o aviso para
 * assumir o atendimento.
 */
export const ChatComposer: FC<ChatComposerProps> = ({ contact, contactService, serviceActions, replyingTo, onCancelReply, className }) => {
  const { isReplyTimeExpired, canSendMessage } = canReplyToContact(contact, contactService);

  if (canSendMessage)
    return (
      <div className={className ?? "px-4 pb-3"}>
        <CreateMessageBar contact={contact} replyingTo={replyingTo} onCancelReply={onCancelReply} />
      </div>
    );

  if (contactService && isReplyTimeExpired)
    return (
      <div className={`flex flex-col gap-2 pt-2 ${className ?? "px-4 pb-3"}`}>
        <p className="text-muted-foreground text-center text-sm">
          O prazo para responder livremente este contato acabou. Envie um template para retomar a conversa.
        </p>
        <DialogSendTemplate contactService={contactService} whatsappConfigurationId={contact.whatsappConfigurationId} />
      </div>
    );

  if (contactService)
    return (
      <div className={`pt-2 ${className ?? "px-4 pb-3"}`}>
        <ReplyBlockedNotice contactService={contactService} serviceActions={serviceActions} />
      </div>
    );

  return null;
};
