import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { whatsappService } from "@/services/api/whatsappService";
import { IsTopScrolled } from "@/utils/scroll";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface UseContactMessagesProps {
  contact: WhatsappContactMessage;
}

export const useContactMessages = ({ contact }: UseContactMessagesProps) => {
  const { client } = useClientContext();
  const { socket, isConnected } = useSocketContext();

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
    socket.on(`contact:${contact.id}:messages:update`, (data: WhatsappMessage) => {
      setNewMessagesList((prev) => [data, ...prev]);
    });

    return () => {
      socket.off(`contact:${contact.id}:messages:update`);
    };
  }, [contact.id, isConnected]);

  return {
    onScrollChat,
    isFetching: findAllWhatsappMessagesByContact.isFetching,
    messages: [...newMessagesList, ...(findAllWhatsappMessagesByContact.data?.pages.flatMap((page) => page.items) ?? [])],
  };
};
