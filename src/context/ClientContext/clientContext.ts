import { createContext, useContext } from "react";

type ClientContextProps = {
  client: Client;
  access: TenantAccess;
  can: (permission: Permission) => boolean;
  // Plano com o módulo CRM e permissão de usá-lo
  canUseCrm: boolean;
  // Plano com o módulo de anúncios e permissão de ver anúncios
  canUseAds: boolean;
};

export const ClientContext = createContext({} as ClientContextProps);

export const useClientContext = () => useContext(ClientContext);
