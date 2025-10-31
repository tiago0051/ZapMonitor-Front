import { globalContants } from "@/contants/globalContants";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { useState, type FC, useEffect } from "react";
import { useDebounceValue, useLocalStorage } from "usehooks-ts";
import { WhatsappChatItem } from "./components/whatsappChatItem";
import { DialogFilterCategory } from "../components/dialogSelectCategory/dialogFilterCategory";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/context/ClientContext/clientContext";

type WhatsappContactsListProps = {
  contactSelected: WhatsappContactMessage | null;
  setContactSelected: (contact: WhatsappContactMessage) => void;
  usersInContacts: Record<string, User[]>;
};

export const WhatsappContactsList: FC<WhatsappContactsListProps> = ({ contactSelected, setContactSelected, usersInContacts }) => {
  const { client } = useClientContext();

  const [messages, setMessages] = useLocalStorage<WhatsappContactMessage[]>("messages", []);

  const [filterCategories, setFilterCategories] = useState<WhatsappMessageCategory[]>([]);
  const [filterText, setFilterText] = useDebounceValue("", globalContants.DEBOUNCE_DELAY);

  const findAllContactMessagesQuery = useQuery({
    queryKey: ["chat:update", "findAllContactMessages", filterCategories, filterText],
    queryFn: async () =>
      await whatsappService.findAllContactMessagesByUser({
        queries: {
          page: 1,
          take: 200,
          categoryIds: filterCategories.map((cat) => cat.id),
          text: filterText,
        },
        params: {
          clientId: client.id,
        },
      }),
    enabled: messages.length === 0,
  });
  const listPagesContactMessages = findAllContactMessagesQuery.data;

  useEffect(() => {
    if (listPagesContactMessages) {
      const newMessagesList = listPagesContactMessages.items;
      setMessages(newMessagesList);
    }
  }, [listPagesContactMessages, setMessages]);

  return (
    <div className="space-y-4">
      <div className="space-y-2 pr-4">
        <h2 className="mb-2">Filtros</h2>
        <DialogFilterCategory categories={filterCategories} onSelectCategories={setFilterCategories} />
        <Input placeholder="Buscar contatos" onChange={(e) => setFilterText(e.currentTarget.value)} />
      </div>
      <div className="max-h-[calc(100vh-210px)] space-y-1 overflow-y-auto">
        {messages.map((contactMessage) => (
          <WhatsappChatItem
            contactMessage={contactMessage}
            isSelected={contactSelected?.id === contactMessage.id}
            onClick={() => setContactSelected(contactMessage)}
            key={contactMessage.id}
            usersInContact={usersInContacts[contactMessage.id] || []}
          />
        ))}

        {findAllContactMessagesQuery.isFetching && (
          <li className="grid gap-2 border-b p-4">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-4 w-full" />
          </li>
        )}
      </div>
    </div>
  );
};
