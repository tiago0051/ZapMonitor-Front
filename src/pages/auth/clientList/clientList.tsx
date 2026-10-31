import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserContext } from "@/context/UserContext/userContext";
import { DataTable } from "@/components/ui/dataTable";
import { clientService } from "@/services/api/clientService";
import { useQuery } from "@tanstack/react-query";
import { getColumns } from "./clientListColumns";
import { Link, Navigate } from "react-router";

export const ClientList = () => {
  const { user } = useUserContext();
  const findAllClientQuery = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientService.findAll(),
  });

  const clientsList = findAllClientQuery.data;
  const onlyClient = clientsList?.length === 1 && clientsList[0];

  const columns = getColumns();

  if (onlyClient) return <Navigate to={`/dashboard/client/${onlyClient.id}`} />;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Lista de clientes</CardTitle>
        {(user?.isImplanter || user?.isOwner) && (
          <CardAction className="flex gap-2">
            {user.isImplanter && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/implanter">Painel do implantador</Link>
              </Button>
            )}
            {user.isOwner && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/owner">Tela do dono</Link>
              </Button>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {findAllClientQuery.isLoading && <p>Loading...</p>}
        {findAllClientQuery.isError && <p>Error fetching clients</p>}
        {clientsList && <DataTable columns={columns} data={clientsList} />}
      </CardContent>
    </Card>
  );
};
