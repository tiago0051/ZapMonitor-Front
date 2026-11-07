import { isBefore } from "date-fns";

/** Diz se o atendente pode responder livremente o contato agora. */
export const canReplyToContact = (contact: WhatsappContactMessage, contactService?: WhatsappContactService) => {
  const isReplyTimeExpired = contact.replyTimeExpiredAt ? isBefore(new Date(contact.replyTimeExpiredAt), new Date()) : false;

  return { isReplyTimeExpired, canSendMessage: !!contactService?.canBeSentMessage && !isReplyTimeExpired };
};
