import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Conversa do contato do negócio, buscada pelo telefone na aba Todos (como o link do CRM para o atendimento). Mensagem
 * recebida renova o prazo de 24h, então o contato é buscado de novo.
 */
export const useDockContact = (contact: DealContact) => {
  const { client } = useClientContext();
  const { socket, isConnected } = useSocketContext();

  const query = useQuery({
    // Sob ["whatsapp", "contacts"] para ser atualizada junto quando o atendimento muda (assumir, reconectar)
    queryKey: ["whatsapp", "contacts", "crmChatDock", contact.id],
    queryFn: async () => {
      const response = await whatsappService.findAllContacts({
        params: { clientId: client.id },
        queries: { page: 1, take: 10, tab: "all", text: contact.phoneNumber },
      });

      return response.items.find((item) => item.id === contact.id) ?? null;
    },
  });

  const { refetch } = query;

  useEffect(() => {
    const handleNewMessage = (message: WhatsappMessage) => {
      if (message.type === WhatsappMessageType.INCOMING) refetch();
    };

    socket.on(`contact:${contact.id}:messages:update`, handleNewMessage);

    return () => {
      socket.off(`contact:${contact.id}:messages:update`, handleNewMessage);
    };
  }, [contact.id, isConnected, socket, refetch]);

  return { chatContact: query.data ?? null, isLoading: query.isLoading, isError: query.isError };
};
