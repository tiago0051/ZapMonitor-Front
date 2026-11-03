import { Outlet, useParams } from "react-router";
import { ClientContext } from "./clientContext";
import { useSuspenseQueries } from "@tanstack/react-query";
import { clientService } from "@/services/api/clientService";

export const ClientProvider = () => {
  const { clientId } = useParams<{ clientId: string }>();

  const [findClientQuery, findMyAccessQuery] = useSuspenseQueries({
    queries: [
      {
        meta: { errorHandledInline: true },
        queryKey: ["client", clientId],
        queryFn: () => clientService.findById({ params: { clientId: clientId! } }),
      },
      {
        meta: { errorHandledInline: true },
        queryKey: ["clientAccess", clientId],
        queryFn: () => clientService.findMyAccess({ params: { clientId: clientId! } }),
      },
    ],
  });

  const client = findClientQuery.data;
  const access = findMyAccessQuery.data;

  const can = (permission: Permission) => access.permissions.includes(permission);
  const canUseCrm = access.crmEnabled && can("crm.view");

  return (
    <ClientContext.Provider value={{ client, access, can, canUseCrm }}>
      <Outlet />
    </ClientContext.Provider>
  );
};
