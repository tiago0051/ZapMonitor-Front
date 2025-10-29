import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { socket } from "@/services/socket/socket";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { IsTopScrolled } from "@/utils/scroll";
import { WhatsappChatMessageListItem } from "./whatsappChatMessageList/whatsappChatMessageListItem";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useWhatsappContext } from "../whatsappLayout";
import { WhatsappChatCreateMessageBar } from "./whatsappChatCreateMessageBar";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";

type WhatsappChatMessageListProps = {
  contactService: WhatsappContactService;
  whatsappConfigurationId: string;
  className?: string;
};

export const WhatsappChatMessageList = ({ contactService, whatsappConfigurationId, className }: WhatsappChatMessageListProps) => {
  const { user } = useUserContext();
  const { client } = useClientContext();
  const { playSound } = useWhatsappContext();

  const [newMessagesList, setNewMessagesList] = useState<WhatsappMessage[]>([]);

  const findAllWhatsappMessagesByContact = useInfiniteQuery({
    queryKey: [`contact-${contactService.id}`, "findAllWhatsappMessagesByContact", contactService.id],
    queryFn: async ({ pageParam = 1 }) =>
      await whatsappService.findAllWhatsappMessagesByContact({
        params: {
          contactMessageId: contactService.id,
          clientId: client.id,
        },
        queries: {
          page: pageParam,
          take: 10,
        },
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.canNextPage ? allPages.length + 1 : undefined),
    initialPageParam: 1,
  });

  function onScrollChat(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    const isTopScrolled = IsTopScrolled(event.currentTarget);

    if (isTopScrolled && findAllWhatsappMessagesByContact.hasNextPage && !findAllWhatsappMessagesByContact.isFetching) {
      findAllWhatsappMessagesByContact.fetchNextPage();
    }
  }

  useEffect(() => {
    if (user) {
      socket.emit("chat:subscribe", user.id, contactService.id);
    }
    return () => {
      socket.emit("chat:unsubscribe", contactService.id);
    };
  }, [user, contactService]);

  useEffect(() => {
    socket.on(`contact:${contactService.id}:newMessage`, (data: WhatsappMessage) => {
      const isNewMessageIncoming = data.type === WhatsappMessageType.INCOMING;

      if (isNewMessageIncoming) playSound();

      setNewMessagesList((prev) => [data, ...prev]);
    });

    return () => {
      socket.off(`contact:${contactService.id}:newMessage`);
    };
  }, [contactService.id, playSound]);

  useEffect(() => {
    setNewMessagesList([]);
  }, [findAllWhatsappMessagesByContact.data]);

  return (
    <div className={cn(className, "grid h-full grid-rows-[auto_min-content] overflow-hidden pt-4")}>
      <div onScroll={onScrollChat} className="flex max-h-full flex-col-reverse gap-2 overflow-auto px-4">
        {newMessagesList.map((message) => (
          <WhatsappChatMessageListItem message={message} key={message.id} />
        ))}

        {findAllWhatsappMessagesByContact.data?.pages.map((page) =>
          page.items.map((message) => <WhatsappChatMessageListItem message={message} key={message.id} />),
        )}

        {findAllWhatsappMessagesByContact.isFetching &&
          new Array(3).fill({}).map((_v, index) => (
            <div key={index} data-my={index % 2 === 0} className="bg-secondary w-5/6 shrink-0 rounded-sm p-2 data-[my=true]:self-end">
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
      </div>

      {contactService.canBeSentMessage && (
        <WhatsappChatCreateMessageBar contactService={contactService} whatsappConfigurationId={whatsappConfigurationId} />
      )}
    </div>
  );
};
