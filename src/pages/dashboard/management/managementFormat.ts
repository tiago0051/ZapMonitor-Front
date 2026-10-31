import { formatPhoneNumber } from "@/utils/formatString";

export const getContactName = (contact: ManagementContact) => contact.surname?.trim() || contact.name?.trim() || "Sem nome";

export const getContactPhone = (contact: ManagementContact) => formatPhoneNumber(contact.phoneNumber);

export const serviceStatusLabel: Record<number, string> = {
  1: "No fluxo",
  2: "Na fila",
  3: "Em atendimento",
  4: "Finalizado",
};
