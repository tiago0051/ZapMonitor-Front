import { Outlet, useParams } from "react-router";
import { ClientContext } from "./clientContext";
import { useSuspenseQuery } from "@tanstack/react-query";
import { clientService } from "@/services/api/clientService";

export const ClientProvider = () => {
  const { clientId } = useParams<{ clientId: string }>();

  const findClientQuery = useSuspenseQuery({
    queryKey: ["client", clientId],
    queryFn: () =>
      clientService.findById({
        params: {
          clientId: clientId!,
        },
      }),
  });

  const client = findClientQuery.data;

  return (
    <ClientContext.Provider value={{ client }}>
      <Outlet />
    </ClientContext.Provider>
  );
};
