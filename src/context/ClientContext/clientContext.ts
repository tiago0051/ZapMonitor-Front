import { createContext, useContext } from "react";

type ClientContextProps = {
  client: Client;
};

export const ClientContext = createContext({} as ClientContextProps);

export const useClientContext = () => useContext(ClientContext);
