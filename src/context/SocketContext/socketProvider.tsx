import { SocketContext } from "./socketContext";
import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router";
import { io } from "socket.io-client";

export const SocketProvider: React.FC = () => {
  const URL = import.meta.env.VITE_API_URL;

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
  return (
    <SocketContext.Provider value={{ isConnected, socket }}>
      <Outlet />
    </SocketContext.Provider>
  );
};
