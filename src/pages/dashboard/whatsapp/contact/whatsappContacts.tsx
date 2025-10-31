import { globalContants } from "@/contants/globalContants";
import { useState, type FC } from "react";
import { useDebounceValue } from "usehooks-ts";
import { WhatsappChatItem } from "./components/whatsappChatItem";
import { DialogFilterCategory } from "../components/dialogSelectCategory/dialogFilterCategory";
import { Input } from "@/components/ui/input";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";

type WhatsappContactsListProps = {
  contactSelected: WhatsappContactMessage | null;
  setContactSelected: (contact: WhatsappContactMessage) => void;
  usersInContacts: Record<string, User[]>;
};

export const WhatsappContactsList: FC<WhatsappContactsListProps> = ({ contactSelected, setContactSelected, usersInContacts }) => {
  const { allContacts, inServiceContacts } = useWhatsappContext();

  const [filterCategories, setFilterCategories] = useState<WhatsappMessageCategory[]>([]);
  const [filterText, setFilterText] = useDebounceValue("", globalContants.DEBOUNCE_DELAY);

  const contactsConcatenated = [
    ...inServiceContacts,
    ...allContacts.filter((contact) => !inServiceContacts.some((inService) => inService.id === contact.id)),
  ];

  const filteredContacts = contactsConcatenated.filter((contact) => {
    const contactName = contact.surname || contact.name;
    const phoneNumber = contact.phoneNumber.replace(/\D/g, "");

    const matchesCategories =
      filterCategories.length === 0 ||
      contact.categories.some((category) => filterCategories.some((filterCategory) => category.id === filterCategory.id));
    const matchesText =
      contactName.toLowerCase().includes(filterText.toLowerCase()) ||
      phoneNumber.includes(filterText.replace(/\D/g, "")) ||
      contact.messageContent?.toLowerCase().includes(filterText.toLowerCase());

    return matchesCategories && matchesText;
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2 pr-4">
        <h2 className="mb-2">Filtros</h2>
        <DialogFilterCategory categories={filterCategories} onSelectCategories={setFilterCategories} />
        <Input placeholder="Buscar contatos" onChange={(e) => setFilterText(e.currentTarget.value)} />
      </div>
      <div className="max-h-[calc(100vh-210px)] space-y-1 overflow-y-auto">
        {filteredContacts.map((contactMessage) => (
          <WhatsappChatItem
            contactMessage={contactMessage}
            isSelected={contactSelected?.id === contactMessage.id}
            onClick={() => setContactSelected(contactMessage)}
            key={contactMessage.id}
            usersInContact={usersInContacts[contactMessage.id] || []}
          />
        ))}
      </div>
    </div>
  );
};
