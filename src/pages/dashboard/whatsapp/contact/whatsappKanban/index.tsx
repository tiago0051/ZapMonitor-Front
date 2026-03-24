import { type FC } from "react";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { WhatsappKanbanColumn } from "./whatsappKanbanColumn";

type WhatsappKanbanProps = {
  filterCategories: WhatsappMessageCategory[];
  filterText: string;
};

function orderContactsByLastMessage(contacts: WhatsappContactMessage[]) {
  return [...contacts].sort((a, b) => {
    const dateA = a.messageCreatedAt ? new Date(a.messageCreatedAt).getTime() : 0;
    const dateB = b.messageCreatedAt ? new Date(b.messageCreatedAt).getTime() : 0;

    const timeA = isNaN(dateA) ? 0 : dateA;
    const timeB = isNaN(dateB) ? 0 : dateB;

    return timeB - timeA;
  });
}

export const WhatsappKanban: FC<WhatsappKanbanProps> = ({ filterCategories, filterText }) => {
  const { user } = useUserContext();
  const { allContacts } = useWhatsappContext();

  const filteredContacts = allContacts.filter((contact) => {
    const filterOnlyNumbers = filterText.replace(/\D/g, "");

    const contactName = contact.surname || contact.name || "";
    const phoneNumber = contact.phoneNumber.replace(/\D/g, "");

    const matchesCategories =
      filterCategories.length === 0 ||
      contact.categories.some((category) => filterCategories.some((filterCategory) => category.id === filterCategory.id));
    const matchesText =
      contactName.toLowerCase().includes(filterText.toLowerCase()) ||
      (filterOnlyNumbers && phoneNumber.includes(filterOnlyNumbers)) ||
      contact.messageContent?.toLowerCase().includes(filterText.toLowerCase());

    return matchesCategories && matchesText;
  });

  const awaitingServiceContacts = orderContactsByLastMessage(filteredContacts.filter((contact) => contact.awaitService));
  const mySevicesContacts = orderContactsByLastMessage(filteredContacts.filter((contact) => contact.serviceUserServiceId === user?.id));
  const otherSevicesContacts = orderContactsByLastMessage(
    filteredContacts.filter((contact) => contact.serviceUserServiceId && contact.serviceUserServiceId !== user?.id),
  );
  const otherContacts = orderContactsByLastMessage(
    filteredContacts.filter((contact) => !contact.awaitService && !contact.serviceUserServiceId),
  ).slice(0, 10);

  console.log(awaitingServiceContacts.findIndex((c) => c.name == "Alexandro Moraes"));

  return (
    <ul className="grid grid-cols-4 space-x-2">
      <WhatsappKanbanColumn contacts={awaitingServiceContacts} title="Aguardando atendimento" />
      <WhatsappKanbanColumn contacts={mySevicesContacts} title="Meus atendimento" />
      <WhatsappKanbanColumn contacts={otherSevicesContacts} title="Em atendimento" />
      <WhatsappKanbanColumn contacts={otherContacts} title="Todos" />
    </ul>
  );
};
