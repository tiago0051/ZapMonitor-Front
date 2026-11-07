import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { useEffect } from "react";

/** Inscreve o socket na conversa do contato enquanto ela estiver na tela. */
export const useChatSubscription = (contactId: string) => {
  const { socket, isConnected } = useSocketContext();
  const { user } = useUserContext();

  useEffect(() => {
    if (user && isConnected) {
      socket.emit("chat:subscribe", contactId);
    }
    return () => {
      if (isConnected) socket.emit("chat:unsubscribe", contactId);
    };
  }, [user, contactId, isConnected, socket]);
};
