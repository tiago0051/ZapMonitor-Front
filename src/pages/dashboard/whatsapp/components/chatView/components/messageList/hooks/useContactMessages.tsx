import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useSocketReconnect } from "@/context/SocketContext/useSocketReconnect";
import { whatsappService } from "@/services/api/whatsappService";
import { IsTopScrolled } from "@/utils/scroll";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Distância do fim (em px) até onde ainda conta como "lendo as últimas mensagens"
const NEAR_BOTTOM_PX = 120;

// Na lista flex-col-reverse o scrollTop é 0 no fim e fica negativo ao subir
const isNearBottom = (element: HTMLElement) => Math.abs(element.scrollTop) < NEAR_BOTTOM_PX;

interface UseContactMessagesProps {
  contact: WhatsappContactMessage;
}

export const useContactMessages = ({ contact }: UseContactMessagesProps) => {
  const { client } = useClientContext();
  const { socket, isConnected } = useSocketContext();
  const queryClient = useQueryClient();

  const [newMessagesList, setNewMessagesList] = useState<WhatsappMessage[]>([]);
  // Mensagens que chegaram enquanto o atendente lia mais acima; vira o botão "↓ N novas"
  const [unseenCount, setUnseenCount] = useState(0);
  const [prevContactId, setPrevContactId] = useState(contact.id);

  if (contact.id !== prevContactId) {
    setPrevContactId(contact.id);
    setNewMessagesList([]);
    setUnseenCount(0);
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

  // Mensagens que chegaram com o socket caído não vieram pelo evento: busca a conversa de novo
  useSocketReconnect(() => {
    queryClient.invalidateQueries({ queryKey: [`contact-${contact.id}`, "findAllWhatsappMessagesByContact", contact.id] });
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
    if (unseenCount > 0 && isNearBottom(event.currentTarget)) setUnseenCount(0);
  }

  function scrollToBottom() {
    // A lista é flex-col-reverse: o fim da conversa é scrollTop 0
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setUnseenCount(0);
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
      const element = scrollRef.current;
      if (element && !isNearBottom(element)) setUnseenCount((count) => count + 1);
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

  const messagesQueryKey = useMemo(() => [`contact-${contact.id}`, "findAllWhatsappMessagesByContact", contact.id], [contact.id]);

  /**
   * Carrega as páginas mais antigas até a mensagem aparecer (resultado da busca). Devolve false se ela não existir mais
   * ou passar do limite de páginas.
   */
  const loadUntilMessage = useCallback(
    async (messageId: string) => {
      const MAX_PAGES = 200;
      for (let attempt = 0; attempt < MAX_PAGES; attempt += 1) {
        const data = queryClient.getQueryData<InfiniteData<PaginatedResponse<WhatsappMessage>>>(messagesQueryKey);
        if (data?.pages.some((page) => page.items.some((message) => message.id === messageId))) return true;

        const lastPage = data?.pages[data.pages.length - 1];
        if (data && !lastPage?.canNextPage) return false;

        const result = await fetchNextPage({ cancelRefetch: false });
        if (result.isError) return false;
      }
      return false;
    },
    [queryClient, messagesQueryKey, fetchNextPage],
  );

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
    unseenCount,
    scrollToBottom,
    loadUntilMessage,
    isLoadingOlder: findAllWhatsappMessagesByContact.isFetchingNextPage,
  };
};
