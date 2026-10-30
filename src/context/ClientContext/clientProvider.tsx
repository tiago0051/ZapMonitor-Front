import { Outlet, useParams } from "react-router";
import { ClientContext } from "./clientContext";
import { useSuspenseQueries } from "@tanstack/react-query";
import { clientService } from "@/services/api/clientService";

export const ClientProvider = () => {
  const { clientId } = useParams<{ clientId: string }>();

  const [findClientQuery, findMyAccessQuery] = useSuspenseQueries({
    queries: [
      {
        queryKey: ["client", clientId],
        queryFn: () => clientService.findById({ params: { clientId: clientId! } }),
      },
      {
        queryKey: ["clientAccess", clientId],
        queryFn: () => clientService.findMyAccess({ params: { clientId: clientId! } }),
      },
    ],
  });

  const client = findClientQuery.data;
  const access = findMyAccessQuery.data;

  const can = (permission: Permission) => access.permissions.includes(permission);

  return (
    <ClientContext.Provider value={{ client, access, can }}>
      <Outlet />
    </ClientContext.Provider>
  );
};
