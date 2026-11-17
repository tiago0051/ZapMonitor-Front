import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useSocketReconnect } from "@/context/SocketContext/useSocketReconnect";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

interface UseContactServiceProps {
  contactId: string;
}

export const useContactService = ({ contactId }: UseContactServiceProps) => {
  const { client } = useClientContext();
  const { socket, isConnected } = useSocketContext();

  const findContactServiceByContact = useQuery({
    queryKey: [`contact-${contactId}`, "findContactServiceByContact", contactId],
    queryFn: () =>
      whatsappService.findContactServiceByContact({
        params: {
          contactId,
          clientId: client.id,
        },
      }),
  });

  // O atendimento pode ter mudado (assumido, transferido, encerrado) enquanto o socket estava caído
  useSocketReconnect(() => findContactServiceByContact.refetch());

  useEffect(() => {
    const handleServiceUpdate = () => {
      findContactServiceByContact.refetch();
    };

    socket.on(`contact:${contactId}:service:update`, handleServiceUpdate);

    return () => {
      socket.off(`contact:${contactId}:service:update`, handleServiceUpdate);
    };
  }, [contactId, isConnected, socket]);

  return {
    contactService: findContactServiceByContact.data,
    isLoading: findContactServiceByContact.isLoading,
  };
};
