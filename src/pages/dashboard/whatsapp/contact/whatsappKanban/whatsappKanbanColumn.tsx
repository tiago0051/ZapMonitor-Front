import type { FC } from "react";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { WhatsappKanbanItem } from "./whatsappKanbanItem";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";

type WhatsappKanbanColumnProps = {
  contacts: WhatsappContactMessage[];
  title: string;
};

type RowWhatsappContact = WhatsappContactMessage & {
  isSelected: boolean;
  onClick: () => void;
  usersInContacts: User[];
};

export const WhatsappKanbanColumn: FC<WhatsappKanbanColumnProps> = ({ contacts, title }) => {
  const { setContactSelected, usersInContacts, contactSelected } = useWhatsappContext();

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50,
  });

  return (
    <li className="rounded border">
      <h3 className="p-2">{title}</h3>

      <List
        rowComponent={RowComponent}
        rowCount={contacts.length}
        rowHeight={rowHeight}
        rowProps={{
          listState: contacts.map((contact) => ({
            ...contact,
            isSelected: contactSelected?.id === contact.id,
            onClick: () => setContactSelected(contact),
            usersInContacts: usersInContacts[contact.id] || [],
          })),
        }}
        className={"h-[calc(100dvh-210px)]"}
      />
    </li>
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
    <WhatsappKanbanItem
      contactMessage={contactMessage}
      isSelected={contactMessage.isSelected}
      onClick={contactMessage.onClick}
      usersInContact={contactMessage.usersInContacts}
      style={style}
    />
  );
}
