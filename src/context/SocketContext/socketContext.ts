import { createContext, useContext } from "react";

type SocketContextProps = {
  isConnected: boolean;
};

export const SocketContext = createContext({} as SocketContextProps);

export const useSocketContext = () => useContext(SocketContext);
