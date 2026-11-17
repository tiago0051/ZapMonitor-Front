import { SocketContext } from "./socketContext";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useClientContext } from "../ClientContext/clientContext";

interface SocketProviderProps {
  // Sem atendimento nem CRM o painel não precisa de tempo real: o socket fica desligado
  enabled?: boolean;
  children: React.ReactNode;
}

const URL = import.meta.env.VITE_API_URL;

/** Um socket só para o painel do cliente inteiro (atendimento, ligações, avisos e CRM). */
export const SocketProvider: React.FC<SocketProviderProps> = ({ enabled = true, children }) => {
  const { client } = useClientContext();

  const socket = useMemo(
    () =>
      // URL relativa (ex.: "/api" via proxy do Vite): conecta na origem atual usando o prefixo como path
      URL.startsWith("/")
        ? io(window.location.origin, {
            path: `${URL.replace(/\/$/, "")}/socket.io`,
            reconnection: true,
            withCredentials: true,
            autoConnect: false,
          })
        : io(URL, {
            reconnection: true,
            withCredentials: true,
            autoConnect: false,
          }),
    [],
  );

  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  // Conecta só enquanto for útil; sair do painel fecha a conexão
  useEffect(() => {
    if (!enabled) return;

    socket.connect();
    return () => {
      socket.disconnect();
      setIsConnected(false);
    };
  }, [enabled, socket]);

  useEffect(() => {
    if (isConnected) {
      socket.emit("chat:start", client.id);
    }
  }, [isConnected, socket, client]);

  return <SocketContext.Provider value={{ isConnected, socket }}>{children}</SocketContext.Provider>;
};
