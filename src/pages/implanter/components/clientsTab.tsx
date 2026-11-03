import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { implanterService } from "@/services/api/implanterService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router";
import { DialogCreateClient } from "./dialogCreateClient";

export const ClientsTab = () => {
  const findClientsQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["implanterClients"],
    queryFn: implanterService.findClients,
  });

  const clients = findClientsQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{clients ? `${clients.length} ${clients.length === 1 ? "tenant" : "tenants"}` : ""}</p>
        <DialogCreateClient />
      </div>

      {findClientsQuery.isLoading && <LoadingState />}
      {findClientsQuery.isError && (
        <ErrorState
          message="Não foi possível buscar os tenants."
          onRetry={() => findClientsQuery.refetch()}
          isRetrying={findClientsQuery.isFetching}
        />
      )}
      {clients && clients.length === 0 && (
        <EmptyState title="Nenhum tenant cadastrado" description="Crie o primeiro tenant pelo botão acima." />
      )}

      {clients && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="gap-3">
              <CardHeader>
                <CardTitle className="truncate">{client.name}</CardTitle>
                <CardDescription>Criado em {format(client.createdAt, "dd/MM/yyyy")}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <p className="text-sm">
                  {client.activeMembers} {client.activeMembers === 1 ? "usuário ativo" : "usuários ativos"}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/dashboard/client/${client.id}`}>Abrir</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
