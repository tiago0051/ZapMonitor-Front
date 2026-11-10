import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { whatsappService } from "@/services/api/whatsappService";
import { IsTopScrolled } from "@/utils/scroll";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseContactMessagesProps {
  contact: WhatsappContactMessage;
}

export const useContactMessages = ({ contact }: UseContactMessagesProps) => {
  const { client } = useClientContext();
  const { socket, isConnected } = useSocketContext();
  const queryClient = useQueryClient();

  const [newMessagesList, setNewMessagesList] = useState<WhatsappMessage[]>([]);
  const [prevContactId, setPrevContactId] = useState(contact.id);

  if (contact.id !== prevContactId) {
    setPrevContactId(contact.id);
    setNewMessagesList([]);
  }

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } = findAllWhatsappMessagesByContact;

  /**
   * Busca a página anterior quando o topo está à vista. Também vale quando as mensagens não enchem a tela (telas
   * grandes): sem rolagem o evento de scroll nunca dispara, então a checagem roda a cada página e ao redimensionar.
   */
  const loadOlderIfAtTop = useCallback(() => {
    const element = scrollRef.current;
    // Depois de uma falha só tenta de novo pelo scroll, para não repetir a requisição sem parar
    if (!element || !hasNextPage || isFetching || isFetchNextPageError) return;

    if (IsTopScrolled(element)) fetchNextPage();
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  function onScrollChat(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    if (hasNextPage && !isFetching && IsTopScrolled(event.currentTarget)) fetchNextPage();
  }

  // A cada página carregada: se ainda não há rolagem, busca a próxima até encher a tela ou acabar
  useEffect(() => {
    const frame = requestAnimationFrame(loadOlderIfAtTop);
    return () => cancelAnimationFrame(frame);
  }, [loadOlderIfAtTop, findAllWhatsappMessagesByContact.data]);

  // Janela maior ou painel lateral fechado aumentam a área do chat
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => loadOlderIfAtTop());
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadOlderIfAtTop]);

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

  const messages = useMemo(() => {
    const fetchedMessages = findAllWhatsappMessagesByContact.data?.pages.flatMap((page) => page.items) ?? [];
    const combined = [...newMessagesList, ...fetchedMessages];

    const seenIds = new Set<string>();

    return combined.filter((message) => {
      if (seenIds.has(message.id)) return false;

      seenIds.add(message.id);
      return true;
    });
  }, [newMessagesList, findAllWhatsappMessagesByContact.data]);

  return {
    scrollRef,
    onScrollChat,
    isFetching: findAllWhatsappMessagesByContact.isFetching,
    messages,
  };
};
