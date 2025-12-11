import { SocketContext } from "./socketContext";
import { useEffect, useState, type FC } from "react";
import { socket } from "@/services/socket/socket";

type SocketProviderProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export const SocketProvider: FC<SocketProviderProps> = ({ children }) => {
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
  return <SocketContext.Provider value={{ isConnected }}>{children}</SocketContext.Provider>;
};
