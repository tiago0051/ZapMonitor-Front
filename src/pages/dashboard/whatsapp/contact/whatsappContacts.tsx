import { globalContants } from "@/contants/globalContants";
import { useState, type FC } from "react";
import { useDebounceValue } from "usehooks-ts";
import { WhatsappChatItem } from "./components/whatsappChatItem";
import { DialogFilterCategory } from "../components/dialogSelectCategory/dialogFilterCategory";
import { Input } from "@/components/ui/input";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";
import { List, type RowComponentProps, useDynamicRowHeight } from "react-window";

type RowWhatsappContact = WhatsappContactMessage & {
  isSelected: boolean;
  onClick: () => void;
  usersInContacts: User[];
};

type WhatsappContactsListProps = {
  usersInContacts: Record<string, User[]>;
};

export const WhatsappContactsList: FC<WhatsappContactsListProps> = ({ usersInContacts }) => {
  const { allContacts, contactSelected, setContactSelected } = useWhatsappContext();

  const [filterCategories, setFilterCategories] = useState<WhatsappMessageCategory[]>([]);
  const [filterText, setFilterText] = useDebounceValue("", globalContants.DEBOUNCE_DELAY);

  const filteredContacts = allContacts.filter((contact) => {
    const filterOnlyNumbers = filterText.replace(/\D/g, "");

    const contactName = contact.surname || contact.name;
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

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2 pr-4">
        <h2 className="mb-2">Filtros</h2>
        <DialogFilterCategory categories={filterCategories} onSelectCategories={setFilterCategories} />
        <Input placeholder="Buscar contatos" onChange={(e) => setFilterText(e.currentTarget.value)} />
      </div>
      <List
        rowComponent={RowComponent}
        rowCount={filteredContacts.length}
        rowHeight={rowHeight}
        rowProps={{
          listState: filteredContacts.map((contact) => ({
            ...contact,
            isSelected: contactSelected?.id === contact.id,
            onClick: () => setContactSelected(contact),
            usersInContacts: usersInContacts[contact.id] || [],
          })),
        }}
        className={"h-[calc(100dvh-210px)]"}
      />
    </div>
  );
};

function RowComponent({
  listState,
  index,
  style,
}: RowComponentProps<{
  listState: RowWhatsappContact[];
}>) {
  const contactMessage = listState[index];

  return (
    <WhatsappChatItem
      contactMessage={contactMessage}
      isSelected={contactMessage.isSelected}
      onClick={contactMessage.onClick}
      usersInContact={contactMessage.usersInContacts}
      style={style}
    />
  );
}
