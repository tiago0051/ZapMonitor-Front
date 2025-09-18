import { clientService } from "@/services/api/clientService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DialogCreateClient } from "./components/dialogCreateClient";
import { useState } from "react";
import { AlertDialogCopySecret } from "./components/alertDialogCopySecret";
import { getColumns } from "./clientListColumns";
import { DataTable } from "@/components/ui/dataTable";
import { requestErrorHandling } from "@/utils/request";

export const ClientList = () => {
  const [newClientSecret, setNewClientSecret] = useState<string | null>(null);

  const findAllClientQuery = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientService.findAll(),
  });

  const clientsList = findAllClientQuery.data;

  const generateNewSecretMutation = useMutation({
    mutationFn: clientService.generateNewSecret,
    onSuccess: (data) => {
      setNewClientSecret(data);
    },
    onError: requestErrorHandling,
  });

  const columns = getColumns({
    generateNewSecret: (clientId) =>
      generateNewSecretMutation.mutate({ params: { clientId } }),
  });

  return (
    <>
      <AlertDialogCopySecret
        onClose={() => setNewClientSecret(null)}
        secret={newClientSecret}
      />

      <div className="flex justify-between">
        <h1>Lista de clientes</h1>
        <DialogCreateClient onCreate={setNewClientSecret} />
      </div>
      {findAllClientQuery.isLoading && <p>Loading...</p>}
      {findAllClientQuery.isError && <p>Error fetching clients</p>}
      {clientsList && <DataTable columns={columns} data={clientsList} />}
    </>
  );
};
