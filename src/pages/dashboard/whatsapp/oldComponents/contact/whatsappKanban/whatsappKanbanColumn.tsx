import type { FC } from "react";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { WhatsappKanbanItem } from "./whatsappKanbanItem";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";
import { cn } from "@/lib/utils";

type WhatsappKanbanColumnProps = {
  contacts: WhatsappContactMessage[];
  title: string;
  color: "blue" | "green" | "yellow" | "gray";
};

type RowWhatsappContact = WhatsappContactMessage & {
  isSelected: boolean;
  onClick: () => void;
  usersInContacts: User[];
};

export const WhatsappKanbanColumn: FC<WhatsappKanbanColumnProps> = ({ contacts, title, color }) => {
  const { setContactSelected, usersInContacts, contactSelected } = useWhatsappContext();

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50,
  });

  return (
    <li className={`min-w-[320px] rounded-t-xl border`}>
      <div
        className={cn("flex items-center justify-between overflow-hidden rounded-t-xl p-3", {
          "bg-blue-700": color === "blue",
          "border-blue-700": color === "blue",
          "bg-green-700": color === "green",
          "border-green-700": color === "green",
          "bg-yellow-700": color === "yellow",
          "border-yellow-700": color === "yellow",
          "bg-gray-700": color === "gray",
          "border-gray-700": color === "gray",
        })}
      >
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <span
          className={cn(`rounded-full px-2 py-1 text-xs text-white`, {
            "bg-blue-500": color === "blue",
            "bg-green-500": color === "green",
            "bg-yellow-500": color === "yellow",
            "bg-gray-500": color === "gray",
          })}
        >
          {contacts.length}
        </span>
      </div>

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
        className={"bg-accent/40 h-[calc(100dvh-270px)]"}
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
      onClick={contactMessage.onClick}
      usersInContact={contactMessage.usersInContacts}
      style={style}
    />
  );
}
