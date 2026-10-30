import { createContext, useContext } from "react";

type ClientContextProps = {
  client: Client;
  access: TenantAccess;
  can: (permission: Permission) => boolean;
};

export const ClientContext = createContext({} as ClientContextProps);

export const useClientContext = () => useContext(ClientContext);
