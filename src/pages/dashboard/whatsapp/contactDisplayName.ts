/** Nome do contato como a lista mostra: o nome dado pela equipe (surname) vem antes do nome do perfil do WhatsApp. */
export const contactDisplayName = (contact: Pick<WhatsappContactMessage, "name" | "surname">, fallback = "Sem nome") =>
  contact.surname?.trim() || contact.name?.trim() || fallback;
