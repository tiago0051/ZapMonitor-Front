import { globalContants } from "@/contants/globalContants";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useDebounceValue } from "usehooks-ts";
import type { ContactUpdate } from "./types/contactUpdate";

interface UseContactsListService {
  search: string;
  tab: Tab;
  serviceGroupId?: string;
  enabled?: boolean;
}

// Fila e Meus costumam ser curtas; Todos lista a base inteira, então carrega em páginas menores
const pageSizeByTab: Record<Tab, number> = { queue: 50, mine: 50, all: 20 };

type ContactsPages = InfiniteData<PaginatedResponse<WhatsappContactMessage>, number>;

export const useContactsListService = ({ search, tab, serviceGroupId, enabled = true }: UseContactsListService) => {
  const { client } = useClientContext();
  const { socket, isConnected } = useSocketContext();
  const { user } = useUserContext();

  const [searchDebounced] = useDebounceValue(search, globalContants.DEBOUNCE_DELAY);

  const queryClient = useQueryClient();

  const contactsStatsQuery = useQuery({
    queryFn: async () =>
      whatsappService.findContactsStats({
        params: {
          clientId: client.id,
        },
        queries: {
          serviceGroupId,
        },
      }),
    queryKey: ["whatsapp", "contactsStats", serviceGroupId],
    enabled,
  });

  const contactsMessageQuery = useInfiniteQuery({
    meta: { errorHandledInline: true },
    queryFn: async ({ pageParam }) =>
      whatsappService.findAllContacts({
        params: {
          clientId: client.id,
        },
        queries: {
          page: pageParam,
          take: pageSizeByTab[tab],
          tab,
          text: searchDebounced,
          serviceGroupId: tab === "queue" ? serviceGroupId : undefined,
        },
      }),
    queryKey: ["whatsapp", "contacts", tab, searchDebounced, serviceGroupId],
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.canNextPage ? lastPage.page + 1 : undefined),
    enabled,
  });

  const refetchStats = contactsStatsQuery.refetch;

  // Refaz as requisições ao (re)conectar o socket
  useEffect(() => {
    if (!isConnected) return;

    queryClient.invalidateQueries({ queryKey: ["whatsapp", "contacts"] });
    queryClient.invalidateQueries({ queryKey: ["whatsapp", "contactsStats"] });
  }, [isConnected, queryClient]);

  useEffect(() => {
    const isTabQueue = tab === "queue";
    const isTabMine = tab === "mine";
    const queryKey = ["whatsapp", "contacts", tab, searchDebounced, serviceGroupId];

    // Contatos sem grupo aparecem na fila de todos os grupos
    const isInSelectedServiceGroup = (contact: WhatsappContactMessage) =>
      !serviceGroupId || !contact.serviceGroupId || contact.serviceGroupId === serviceGroupId;

    const handleContactUpdate = ({ contact }: ContactUpdate) => {
      refetchStats();

      const data = queryClient.getQueryData<ContactsPages>(queryKey);

      if (!data) return;

      const hasContact = data.pages.some((page) => page.items.some((item) => item.id === contact.id));
      const hasMorePages = !!data.pages[data.pages.length - 1]?.canNextPage;

      const updatePages = (update: (items: WhatsappContactMessage[], isLastPage: boolean) => WhatsappContactMessage[]) =>
        queryClient.setQueryData<ContactsPages>(queryKey, {
          ...data,
          pages: data.pages.map((page, index) => ({ ...page, items: update(page.items, index === data.pages.length - 1) })),
        });

      if (hasContact) {
        const doRemoveFromQueueTab = isTabQueue && (!!contact.serviceRepresentative || !isInSelectedServiceGroup(contact));
        const doRemoveFromMineTab = isTabMine && contact.serviceRepresentative !== user?.name;

        if (doRemoveFromQueueTab || doRemoveFromMineTab) {
          updatePages((items) => items.filter((item) => item.id !== contact.id));
          // A paginação é por posição: sem o contato, a próxima página pularia um item, então recarrega o que já foi carregado
          if (hasMorePages) queryClient.refetchQueries({ queryKey, exact: true });
          return;
        }

        updatePages((items) => items.map((item) => (item.id === contact.id ? contact : item)));
        return;
      }

      const doAddContactInQueueTab = isTabQueue && !contact.serviceRepresentative && isInSelectedServiceGroup(contact);
      const doAddContactInMineTab = isTabMine && !!contact.serviceRepresentative && contact.serviceRepresentative === user?.name;

      // A fila é ordenada por chegada: com páginas por carregar, o contato novo aparece quando a rolagem chegar ao fim
      if ((doAddContactInQueueTab || doAddContactInMineTab) && !hasMorePages) {
        updatePages((items, isLastPage) => (isLastPage ? [...items, contact] : items));
      }
    };

    if (isConnected) socket.on("contacts:update", handleContactUpdate);

    // Remove só este handler: as notificações também escutam o evento
    return () => {
      socket.off("contacts:update", handleContactUpdate);
    };
  }, [isConnected, socket, tab, searchDebounced, serviceGroupId, queryClient, refetchStats, user]);

  const queueContactsLength = contactsStatsQuery.data?.queueCount ?? 0;
  const mineContactsLength = contactsStatsQuery.data?.myCount ?? 0;

  // Páginas buscadas em momentos diferentes podem repetir um contato que mudou de posição
  const contacts = useMemo(() => {
    const seenIds = new Set<string>();
    return (contactsMessageQuery.data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((contact) => !seenIds.has(contact.id) && !!seenIds.add(contact.id));
  }, [contactsMessageQuery.data]);

  return {
    stats: {
      queueLength: queueContactsLength,
      mineLength: mineContactsLength,
      isLoading: !enabled || contactsStatsQuery.isLoading,
    },
    contacts: {
      items: contacts,
      isLoading: !enabled || contactsMessageQuery.isLoading,
      isEmpty: contacts.length === 0,
      isError: contactsMessageQuery.isError && !contactsMessageQuery.data,
      isRefetching: contactsMessageQuery.isFetching,
      refetch: contactsMessageQuery.refetch,
      hasNextPage: contactsMessageQuery.hasNextPage,
      isFetchingNextPage: contactsMessageQuery.isFetchingNextPage,
      fetchNextPage: contactsMessageQuery.fetchNextPage,
    },
  };
};
