import { SocketContext } from "./socketContext";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useClientContext } from "../ClientContext/clientContext";

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const URL = import.meta.env.VITE_API_URL;

  const { client } = useClientContext();

  const socket = useMemo(
    () =>
      io(URL, {
        reconnection: true,
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
  }, []);

  useEffect(() => {
    if (isConnected) {
      socket.emit("chat:start", client.id);
    }
  }, [isConnected, socket, client]);

  return <SocketContext.Provider value={{ isConnected, socket }}>{children}</SocketContext.Provider>;
};
