import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/dataTable";
import { clientService } from "@/services/api/clientService";
import { useQuery } from "@tanstack/react-query";
import { getColumns } from "./clientListColumns";
import { Navigate } from "react-router";

export const ClientList = () => {
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
      </CardHeader>
      <CardContent>
        {findAllClientQuery.isLoading && <p>Loading...</p>}
        {findAllClientQuery.isError && <p>Error fetching clients</p>}
        {clientsList && <DataTable columns={columns} data={clientsList} />}
      </CardContent>
    </Card>
  );
};
