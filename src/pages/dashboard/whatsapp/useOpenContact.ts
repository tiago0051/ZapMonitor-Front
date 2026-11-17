import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect } from "react";
import type { ContactUpdate } from "./types/contactUpdate";

// Sob ["whatsapp", "contacts"]: assumir/encerrar atendimento e a reconexão do socket já atualizam este cache junto
export const openContactQueryKey = (contactId: string | null) => ["whatsapp", "contacts", "open", contactId];

// 404: não existe neste cliente; 400: id inválido no link
const isNotFoundError = (error: unknown) => isAxiosError(error) && [400, 404].includes(error.response?.status ?? 0);

/** Cópia do contato que já está em alguma lista carregada, para abrir a conversa sem esperar a busca. */
function findInContactLists(queryClient: QueryClient, contactId: string) {
  const lists = queryClient.getQueriesData<InfiniteData<PaginatedResponse<WhatsappContactMessage>>>({ queryKey: ["whatsapp", "contacts"] });

  for (const [, data] of lists) {
    const contact = data?.pages?.flatMap((page) => page.items ?? []).find((item) => item.id === contactId);
    if (contact) return contact;
  }

  return undefined;
}

/**
 * Conversa aberta no atendimento, pelo id da URL. Fica sempre atualizada (eventos do socket e recargas), em vez de ser
 * a cópia do momento do clique: o prazo de resposta e o atendente mudam com a conversa aberta.
 */
export const useOpenContact = (contactId: string | null) => {
  const { client } = useClientContext();
  const { socket } = useSocketContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: openContactQueryKey(contactId),
    queryFn: () => whatsappService.findContact({ params: { clientId: client.id, contactId: contactId! } }),
    enabled: !!contactId,
    // A cópia da lista aparece na hora; a busca roda logo em seguida para trazer a versão atual
    initialData: () => (contactId ? findInContactLists(queryClient, contactId) : undefined),
    initialDataUpdatedAt: 0,
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 2,
  });

  useEffect(() => {
    if (!contactId) return;

    const handleContactUpdate = ({ contact }: ContactUpdate) => {
      if (contact.id === contactId) queryClient.setQueryData(openContactQueryKey(contactId), contact);
    };

    socket.on("contacts:update", handleContactUpdate);
    // Remove só este handler: a lista e os avisos também escutam o evento
    return () => {
      socket.off("contacts:update", handleContactUpdate);
    };
  }, [contactId, socket, queryClient]);

  /** Guarda a cópia do clique na lista, quando ainda não há uma, para a conversa abrir sem carregamento. */
  const seed = (contact: WhatsappContactMessage) => {
    if (!queryClient.getQueryData(openContactQueryKey(contact.id))) queryClient.setQueryData(openContactQueryKey(contact.id), contact);
  };

  return {
    contact: contactId ? (query.data ?? null) : null,
    isLoading: !!contactId && query.isLoading,
    isNotFound: !!contactId && query.isError && isNotFoundError(query.error),
    isError: !!contactId && query.isError && !query.data && !isNotFoundError(query.error),
    isRetrying: query.isFetching,
    refetch: query.refetch,
    seed,
  };
};
