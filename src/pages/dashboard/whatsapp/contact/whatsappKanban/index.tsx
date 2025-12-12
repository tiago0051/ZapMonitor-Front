import { type FC } from "react";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { WhatsappKanbanColumn } from "./whatsappKanbanColumn";

type WhatsappKanbanProps = {
  filterCategories: WhatsappMessageCategory[];
  filterText: string;
};

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

  const awaitingServiceContacts = filteredContacts.filter((contact) => contact.awaitService);
  const mySevicesContacts = filteredContacts.filter((contact) => contact.serviceUserServiceId === user?.id);
  const otherSevicesContacts = filteredContacts.filter(
    (contact) => contact.serviceUserServiceId && contact.serviceUserServiceId !== user?.id,
  );

  return (
    <ul className="grid grid-cols-4 space-x-2">
      <WhatsappKanbanColumn contacts={awaitingServiceContacts} title="Aguardando atendimento" />
      <WhatsappKanbanColumn contacts={mySevicesContacts} title="Meus atendimento" />
      <WhatsappKanbanColumn contacts={otherSevicesContacts} title="Em atendimento" />
      <WhatsappKanbanColumn contacts={filteredContacts} title="Todos" />
    </ul>
  );
};
