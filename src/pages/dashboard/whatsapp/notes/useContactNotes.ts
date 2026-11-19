import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useSocketReconnect } from "@/context/SocketContext/useSocketReconnect";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const contactNotesQueryKey = (contactId: string) => [`contact-${contactId}`, "internalNotes", contactId];

/** Notas internas da conversa, em ordem do tempo; as novas chegam pelo socket. */
export const useContactNotes = (contactId: string) => {
  const { client } = useClientContext();
  const { socket, isConnected } = useSocketContext();
  const queryClient = useQueryClient();
  const queryKey = contactNotesQueryKey(contactId);

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey,
    queryFn: () => whatsappService.findInternalNotes({ params: { clientId: client.id, contactId } }),
  });

  useSocketReconnect(() => {
    queryClient.invalidateQueries({ queryKey: contactNotesQueryKey(contactId) });
  });

  useEffect(() => {
    const handleNote = (note: WhatsappInternalNote) => addNoteToCache(queryClient, note);

    socket.on(`contact:${contactId}:notes:update`, handleNote);
    return () => {
      socket.off(`contact:${contactId}:notes:update`, handleNote);
    };
  }, [contactId, isConnected, socket, queryClient]);

  return query.data ?? [];
};

/** Coloca a nota na lista sem repetir (quem escreveu recebe pela resposta e pelo socket). */
export function addNoteToCache(queryClient: ReturnType<typeof useQueryClient>, note: WhatsappInternalNote) {
  queryClient.setQueryData<WhatsappInternalNote[]>(contactNotesQueryKey(note.contactId), (old) =>
    old && !old.some((item) => item.id === note.id) ? [...old, note] : (old ?? [note]),
  );
}
