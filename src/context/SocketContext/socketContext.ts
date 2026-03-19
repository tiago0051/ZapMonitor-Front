import { createContext, useContext } from "react";
import { Socket } from "socket.io-client";

type SocketContextProps = {
  isConnected: boolean;
  socket: Socket;
};

export const SocketContext = createContext({} as SocketContextProps);

export const useSocketContext = () => useContext(SocketContext);
