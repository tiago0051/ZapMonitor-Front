/**
 * Pedido para abrir uma conversa vindo de fora da tela de atendimento (avisos de contato novo). A tela aberta trata o
 * pedido (passando pela proteção de edição não salva) e cancela o evento; sem ela, quem pediu navega até a conversa.
 */
export const OPEN_CONTACT_REQUEST_EVENT = "whatsapp:open-contact";

export type OpenContactRequest = { contact: WhatsappContactMessage; tab: Tab };

/** Devolve true quando a tela de atendimento já cuidou do pedido. */
export const requestOpenContact = (detail: OpenContactRequest) =>
  !window.dispatchEvent(new CustomEvent<OpenContactRequest>(OPEN_CONTACT_REQUEST_EVENT, { detail, cancelable: true }));
