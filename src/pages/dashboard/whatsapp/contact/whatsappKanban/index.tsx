import { type FC } from "react";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { WhatsappKanbanColumn } from "./whatsappKanbanColumn";
import { isBefore } from "date-fns";
import { useClientContext } from "@/context/ClientContext/clientContext";

type WhatsappKanbanProps = {
  filterCategories: WhatsappMessageCategory[];
  filterText: string;
};

function orderContactsByLastMessage(contacts: WhatsappContactMessage[], order: "asc" | "desc" = "desc") {
  return [...contacts].sort((a, b) => {
    if (!a.messageCreatedAt) console.log(a.id);
    if (!b.messageCreatedAt) console.log(b.id);

    const dateA = a.messageCreatedAt ? new Date(a.messageCreatedAt).getTime() : 0;
    const dateB = b.messageCreatedAt ? new Date(b.messageCreatedAt).getTime() : 0;

    const timeA = isNaN(dateA) ? 0 : dateA;
    const timeB = isNaN(dateB) ? 0 : dateB;

    return order === "desc" ? timeB - timeA : timeA - timeB;
  });
}

export const WhatsappKanban: FC<WhatsappKanbanProps> = ({ filterCategories, filterText }) => {
  const { user } = useUserContext();
  const { client } = useClientContext();
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

  const aiServiceContacts = orderContactsByLastMessage(
    filteredContacts.filter((contact) => contact.serviceRepresentative === "IA"),
    "asc",
  );

  const awaitingServiceContacts = orderContactsByLastMessage(
    filteredContacts.filter(
      (contact) => contact.awaitService && contact.replyTimeExpiredAt && isBefore(new Date(), new Date(contact.replyTimeExpiredAt)),
    ),
    "asc",
  );
  const mySevicesContacts = orderContactsByLastMessage(filteredContacts.filter((contact) => contact.serviceUserServiceId === user?.id));
  const otherSevicesContacts = orderContactsByLastMessage(
    filteredContacts.filter((contact) => contact.serviceUserServiceId && contact.serviceUserServiceId !== user?.id),
  );
  const otherContacts = orderContactsByLastMessage(
    filteredContacts.filter(
      (contact) =>
        !(contact.awaitService && contact.replyTimeExpiredAt && isBefore(new Date(), new Date(contact.replyTimeExpiredAt))) &&
        !contact.serviceUserServiceId,
    ),
  );

  return (
    <ul className="grid grid-cols-4 space-x-2">
      {client.hasAiConfig && <WhatsappKanbanColumn color="gray" contacts={aiServiceContacts} title="Atendimentos da IA" />}
      <WhatsappKanbanColumn color="blue" contacts={awaitingServiceContacts} title="Aguardando atendente" />
      <WhatsappKanbanColumn color="green" contacts={mySevicesContacts} title="Meus atendimento" />
      <WhatsappKanbanColumn color="yellow" contacts={otherSevicesContacts} title="Em atendimento" />
      {!client.hasAiConfig && <WhatsappKanbanColumn color="gray" contacts={otherContacts} title="Todos" />}
    </ul>
  );
};
