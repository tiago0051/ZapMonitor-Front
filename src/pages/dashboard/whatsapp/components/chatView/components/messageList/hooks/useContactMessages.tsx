import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { whatsappService } from "@/services/api/whatsappService";
import { IsTopScrolled } from "@/utils/scroll";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface UseContactMessagesProps {
  contact: WhatsappContactMessage;
}

export const useContactMessages = ({ contact }: UseContactMessagesProps) => {
  const { client } = useClientContext();
  const { socket, isConnected } = useSocketContext();
  const queryClient = useQueryClient();

  const [newMessagesList, setNewMessagesList] = useState<WhatsappMessage[]>([]);

  const findAllWhatsappMessagesByContact = useInfiniteQuery({
    queryKey: [`contact-${contact.id}`, "findAllWhatsappMessagesByContact", contact.id],
    queryFn: async ({ pageParam = 1 }) =>
      await whatsappService.findAllWhatsappMessagesByContact({
        params: {
          contactMessageId: contact.id,
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
    const handleNewMessage = (data: WhatsappMessage) => {
      setNewMessagesList((prev) => [data, ...prev]);
    };

    socket.on(`contact:${contact.id}:messages:update`, handleNewMessage);

    return () => {
      socket.off(`contact:${contact.id}:messages:update`, handleNewMessage);
    };
  }, [contact.id, isConnected, socket]);

  useEffect(() => {
    const handleMessageUpdate = (data: WhatsappMessage) => {
      setNewMessagesList((prev) => prev.map((message) => (message.id === data.id ? data : message)));

      queryClient.setQueryData<InfiniteData<PaginatedResponse<WhatsappMessage>>>(
        [`contact-${contact.id}`, "findAllWhatsappMessagesByContact", contact.id],
        (old) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((message) => (message.id === data.id ? data : message)),
            })),
          };
        },
      );
    };

    socket.on(`contact:${contact.id}:message:update`, handleMessageUpdate);

    return () => {
      socket.off(`contact:${contact.id}:message:update`, handleMessageUpdate);
    };
  }, [contact.id, isConnected, socket, queryClient]);

  return {
    onScrollChat,
    isFetching: findAllWhatsappMessagesByContact.isFetching,
    messages: [...newMessagesList, ...(findAllWhatsappMessagesByContact.data?.pages.flatMap((page) => page.items) ?? [])],
  };
};
