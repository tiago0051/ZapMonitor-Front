import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Recarrega os negócios quando outra pessoa mexe em um deles. O aviso traz só o id; cada tela busca de novo com as
 * permissões de quem está vendo. Fora de um SocketProvider, não faz nada.
 */
export const useCrmRealtime = () => {
  const { socket, isConnected } = useSocketContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDealUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "myTasks"] });
    };

    socket.on("crm:deal:update", handleDealUpdate);

    return () => {
      socket.off("crm:deal:update", handleDealUpdate);
    };
  }, [socket, isConnected, queryClient]);
};
