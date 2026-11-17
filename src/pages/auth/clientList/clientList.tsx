import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserContext } from "@/context/UserContext/userContext";
import { DataTable } from "@/components/ui/dataTable";
import { clientService } from "@/services/api/clientService";
import { useQuery } from "@tanstack/react-query";
import { getColumns } from "./clientListColumns";
import { Link, Navigate, useSearchParams } from "react-router";
import { RETURN_TO_PARAM, returnToClientId, sanitizeReturnTo } from "@/utils/returnTo";
import { useEffect } from "react";
import { toast } from "sonner";

export const ClientList = () => {
  const { user } = useUserContext();
  const findAllClientQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["clients"],
    queryFn: () => clientService.findAll(),
  });

  const clientsList = findAllClientQuery.data;
  const onlyClient = clientsList?.length === 1 && clientsList[0];

  // Volta do login para a tela guardada (ex.: conversa do aviso), pulando a escolha quando o acesso ao cliente existe
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = sanitizeReturnTo(searchParams.get(RETURN_TO_PARAM));
  const returnToClient = returnTo && returnToClientId(returnTo);
  const canReturn = !!returnTo && (!returnToClient || !!clientsList?.some((client) => client.id === returnToClient));
  const lostAccess = !!returnTo && !!clientsList && !canReturn;

  useEffect(() => {
    if (!lostAccess) return;

    toast.error("Você não tem mais acesso a esse cliente", { description: "Escolha um dos seus clientes para continuar." });
    setSearchParams({}, { replace: true });
  }, [lostAccess, setSearchParams]);

  const columns = getColumns();

  if (canReturn) return <Navigate to={returnTo} replace />;
  if (onlyClient && !returnTo) return <Navigate to={`/dashboard/client/${onlyClient.id}`} />;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Lista de clientes</CardTitle>
        {(user?.isImplanter || user?.isOwner) && (
          <CardAction className="flex flex-wrap justify-end gap-2">
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
        {findAllClientQuery.isLoading && <LoadingState />}
        {findAllClientQuery.isError && (
          <ErrorState
            message="Não foi possível buscar seus clientes."
            onRetry={() => findAllClientQuery.refetch()}
            isRetrying={findAllClientQuery.isFetching}
          />
        )}
        {clientsList && <DataTable columns={columns} data={clientsList} />}
      </CardContent>
    </Card>
  );
};
