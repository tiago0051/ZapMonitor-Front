import { globalContants } from "@/contants/globalContants";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";
import type { ContactUpdate } from "./types/contactUpdate";

interface UseContactsListService {
  search: string;
  tab: Tab;
}

const takeItems = 10;

export const useContactsListService = ({ search, tab }: UseContactsListService) => {
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
      }),
    queryKey: ["whatsapp", "contactsStats"],
  });

  const contactsMessageQuery = useQuery({
    queryFn: async () =>
      whatsappService.findAllContacts({
        params: {
          clientId: client.id,
        },
        queries: {
          page: 1,
          take: takeItems,
          tab,
          text: searchDebounced,
        },
      }),
    queryKey: ["whatsapp", "contacts", tab, searchDebounced],
  });

  useEffect(() => {
    const isTabQueue = tab === "queue";
    const isTabMine = tab === "mine";
    const queryKey = ["whatsapp", "contacts", tab, searchDebounced];

    if (isConnected) {
      socket.on("contacts:update", ({ contact }: ContactUpdate) => {
        contactsStatsQuery.refetch();

        const data = queryClient.getQueryData<PaginatedResponse<WhatsappContactMessage>>(queryKey);

        if (!data) return;

        const { items, ...old } = data;

        const hasContact = items.some((item) => item.id === contact.id);

        if (hasContact) {
          const doRemoveFromQueueTab = isTabQueue && !!contact.serviceRepresentative;
          const doRemoveFromMineTab = isTabMine && contact.serviceRepresentative !== user?.name;

          if (doRemoveFromQueueTab || doRemoveFromMineTab) {
            queryClient.setQueryData(queryKey, {
              ...old,
              items: items.filter((item) => item.id !== contact.id),
              total: Math.max(old.total - 1, 0),
            });
            return;
          }

          queryClient.setQueryData(queryKey, {
            ...old,
            items: items.map((item) => (item.id === contact.id ? contact : item)),
          });
          return;
        }
      });
    }

    return () => {
      socket.off("contacts:update");
    };
  }, [isConnected, socket, tab, searchDebounced, queryClient, contactsStatsQuery, user]);

  const queueContactsLength = contactsStatsQuery.data?.queueCount ?? 0;
  const mineContactsLength = contactsStatsQuery.data?.myCount ?? 0;

  const contacts = contactsMessageQuery.data?.items ?? [];

  return {
    stats: {
      queueLength: queueContactsLength,
      mineLength: mineContactsLength,
      isLoading: contactsStatsQuery.isLoading,
    },
    contacts: {
      items: contacts,
      isLoading: contactsMessageQuery.isLoading,
      isEmpty: contacts.length === 0,
    },
  };
};
