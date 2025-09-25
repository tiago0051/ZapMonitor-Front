import { globalContants } from "@/contants/globalContants";
import { whatsappService } from "@/services/api/whatsappService";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { useDebounceValue } from "usehooks-ts";
import { WhatsappChatItem } from "./components/whatsappChatItem";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { DialogFilterCategory } from "../components/dialogSelectCategory/dialogFilterCategory";
import { Input } from "@/components/ui/input";
import { IsTopScrolled } from "@/utils/scroll";
import { Skeleton } from "@/components/ui/skeleton";

type WhatsappContactOutServiceListProps = {
  contactSelected: WhatsappContactMessage | null;
  setContactSelected: (contact: WhatsappContactMessage) => void;
  usersInContacts: Record<string, User[]>;
};

export const WhatsappContactOutServiceList: FC<WhatsappContactOutServiceListProps> = ({
  contactSelected,
  setContactSelected,
  usersInContacts,
}) => {
  const [filterCategories, setFilterCategories] = useState<WhatsappMessageCategory[]>([]);
  const [filterText, setFilterText] = useDebounceValue("", globalContants.DEBOUNCE_DELAY);

  const findAllContactMessagesQuery = useInfiniteQuery({
    queryKey: ["chat:update", "findAllContactMessages", filterCategories, filterText],
    queryFn: async ({ pageParam = 1 }) =>
      await whatsappService.findAllContactMessagesByUser({
        queries: {
          page: pageParam,
          take: 20,
          categoryIds: filterCategories.map((cat) => cat.id),
          text: filterText,
        },
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.canNextPage ? allPages.length + 1 : undefined),
    initialPageParam: 1,
  });
  const listPagesContactMessages = findAllContactMessagesQuery.data;

  function onScrollChat(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    const isTopScrolled = IsTopScrolled(event.currentTarget);

    if (isTopScrolled && findAllContactMessagesQuery.hasNextPage && !findAllContactMessagesQuery.isFetching) {
      findAllContactMessagesQuery.fetchNextPage();
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 pr-4">
        <h2 className="mb-2">Filtros</h2>
        <DialogFilterCategory categories={filterCategories} onSelectCategories={setFilterCategories} />
        <Input placeholder="Buscar contatos" onChange={(e) => setFilterText(e.currentTarget.value)} />
      </div>
      <div onScroll={onScrollChat} className="max-h-[calc(100vh-210px)] space-y-1 overflow-y-auto">
        {listPagesContactMessages?.pages.map((page) =>
          page.items.map((contactMessage) => (
            <WhatsappChatItem
              isSelected={contactSelected?.id === contactMessage.id}
              isRead={contactMessage.isRead}
              name={contactMessage.name}
              phoneNumber={contactMessage.phoneNumber}
              categories={contactMessage.categories}
              messageContent={contactMessage.messageContent}
              messageContentType={contactMessage.messageContentType}
              onClick={() => setContactSelected(contactMessage)}
              key={contactMessage.id}
              usersInContact={usersInContacts[contactMessage.id] || []}
              isIncoming={contactMessage.messageType === WhatsappMessageType.INCOMING}
            />
          )),
        )}

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
