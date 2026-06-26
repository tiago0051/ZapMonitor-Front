import { type FC } from "react";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { WhatsappKanbanColumn } from "./whatsappKanbanColumn";
import { isBefore } from "date-fns";

type WhatsappKanbanProps = {
  filterCategories: WhatsappMessageCategory[];
  filterText: string;
};

function orderContacts(
  contacts: WhatsappContactMessage[],
  order: "asc" | "desc" = "desc",
  by: "serviceCreatedAt" | "messageCreatedAt" = "serviceCreatedAt",
) {
  return [...contacts].sort((a, b) => {
    const aDate = a[by] || a.messageCreatedAt;
    const bDate = b[by] || b.messageCreatedAt;

    if (!aDate) console.log(a.id);
    if (!bDate) console.log(b.id);

    const dateA = aDate ? new Date(aDate).getTime() : 0;
    const dateB = bDate ? new Date(bDate).getTime() : 0;

    const timeA = isNaN(dateA) ? 0 : dateA;
    const timeB = isNaN(dateB) ? 0 : dateB;

    return order === "desc" ? timeB - timeA : timeA - timeB;
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

  const awaitingServiceContacts = orderContacts(
    filteredContacts.filter(
      (contact) =>
        (contact.awaitService && contact.replyTimeExpiredAt && isBefore(new Date(), new Date(contact.replyTimeExpiredAt))) ||
        contact.serviceRepresentative === "IA",
    ),
    "asc",
  );
  const mySevicesContacts = orderContacts(
    filteredContacts.filter((contact) => contact.serviceUserServiceId === user?.id),
    "desc",
    "messageCreatedAt",
  );
  const otherSevicesContacts = orderContacts(
    filteredContacts.filter((contact) => contact.serviceUserServiceId && contact.serviceUserServiceId !== user?.id),
  );
  const otherContacts = orderContacts(
    filteredContacts.filter(
      (contact) =>
        !(contact.awaitService && contact.replyTimeExpiredAt && isBefore(new Date(), new Date(contact.replyTimeExpiredAt))) &&
        !contact.serviceRepresentative,
    ),
  );

  return (
    <ul className="flex gap-2">
      <WhatsappKanbanColumn color="blue" contacts={awaitingServiceContacts} title="Aguardando atendente" />
      <WhatsappKanbanColumn color="green" contacts={mySevicesContacts} title="Meus atendimento" />
      <WhatsappKanbanColumn color="yellow" contacts={otherSevicesContacts} title="Em atendimento" />
      <WhatsappKanbanColumn color="gray" contacts={otherContacts} title="Todos" />
    </ul>
  );
};
