import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/dataTable";
import { clientService } from "@/services/api/clientService";
import { useQuery } from "@tanstack/react-query";
import { getColumns } from "./clientListColumns";

export const ClientList = () => {
  const findAllClientQuery = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientService.findAll(),
  });

  const clientsList = findAllClientQuery.data;

  const columns = getColumns();

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
