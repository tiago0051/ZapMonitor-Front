import { useEffect, useRef } from "react";
import { useSocketContext } from "./socketContext";

/**
 * Chama `onReconnect` quando o socket volta a conectar (depois de cair, ou ao conectar depois que a tela já buscou os
 * dados). Os eventos emitidos enquanto estava desconectado se perderam, então quem usa busca tudo de novo.
 */
export const useSocketReconnect = (onReconnect: () => void) => {
  const { isConnected } = useSocketContext();
  const wasConnected = useRef(isConnected);
  const latestOnReconnect = useRef(onReconnect);

  useEffect(() => {
    latestOnReconnect.current = onReconnect;
  });

  useEffect(() => {
    if (isConnected && !wasConnected.current) latestOnReconnect.current();
    wasConnected.current = isConnected;
  }, [isConnected]);
};
