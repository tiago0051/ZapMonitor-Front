import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { homeService } from "@/services/api/homeService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// Consulta leve; o socket adianta a fila quando algum contato muda
const REFRESH_INTERVAL_MS = 60 * 1000;
const SOCKET_THROTTLE_MS = 5 * 1000;

export const menuBadgesQueryKey = (clientId: string) => ["menuBadges", clientId];

/** Contadores do menu: fila, tarefas vencidas ou de hoje e aprovações pendentes. */
export const useMenuBadges = () => {
  const { client } = useClientContext();
  const { socket } = useSocketContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: menuBadgesQueryKey(client.id),
    queryFn: () =>
      homeService.findMenuBadges({ params: { clientId: client.id }, queries: { timezoneOffset: new Date().getTimezoneOffset() } }),
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: 15 * 1000,
  });

  useEffect(() => {
    let timer: number | undefined;
    // No máximo uma consulta a cada 5 s, mesmo com muitas mensagens chegando
    const handleUpdate = () => {
      if (timer !== undefined) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        queryClient.invalidateQueries({ queryKey: menuBadgesQueryKey(client.id) });
      }, SOCKET_THROTTLE_MS);
    };

    socket.on("contacts:update", handleUpdate);
    return () => {
      window.clearTimeout(timer);
      socket.off("contacts:update", handleUpdate);
    };
  }, [socket, queryClient, client.id]);

  return query.data ?? null;
};
