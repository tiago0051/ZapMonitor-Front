import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { globalContants } from "@/contants/globalContants";
import { useIsMobile } from "@/hooks/use-mobile";
import { implanterService } from "@/services/api/implanterService";
import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { getColumns } from "../usersColumns";
import { UserActions } from "./userActions";
import { UserMemberships } from "./userMemberships";

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm";

export const UsersTab = () => {
  const isMobile = useIsMobile();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = useDebounceValue<string>("", globalContants.DEBOUNCE_DELAY);
  const [clientId, setClientId] = useState<string>("");

  const findClientsQuery = useQuery({
    queryKey: ["implanterClients"],
    queryFn: implanterService.findClients,
  });

  const findUsersQuery = useQuery({
    queryKey: ["implanterUsers", pagination, search, clientId],
    queryFn: () =>
      implanterService.findUsers({
        queries: { page: pagination.pageIndex + 1, take: pagination.pageSize, search, clientId: clientId || undefined },
      }),
  });

  const users = findUsersQuery.data;
  const columns = getColumns();

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <div className="space-y-2 sm:col-span-4">
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            placeholder="Buscar por nome ou e-mail"
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clientId">Tenant</Label>
          <select
            id="clientId"
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className={selectClassName}
          >
            <option value="">Todos os tenants</option>
            {findClientsQuery.data?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {findUsersQuery.isLoading && <p>Carregando...</p>}
      {findUsersQuery.isError && <p>Erro ao buscar usuários.</p>}

      {users && isMobile && (
        <div className="space-y-3 overflow-auto">
          {users.items.length === 0 && <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>}

          {users.items.map((user) => (
            <Card key={user.id} className="gap-3">
              <CardHeader>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription className="break-all">{user.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <UserMemberships memberships={user.memberships} />
                <UserActions user={user} />
              </CardContent>
            </Card>
          ))}

          {(users.canPreviousPage || users.canNextPage) && (
            <Pagination className="pt-2">
              <PaginationContent>
                {users.canPreviousPage && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))} />
                  </PaginationItem>
                )}
                <PaginationItem>{pagination.pageIndex + 1}</PaginationItem>
                {users.canNextPage && (
                  <PaginationItem>
                    <PaginationNext onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {users && !isMobile && (
        <DataTablePaginate columns={columns} data={users} onPaginationChange={setPagination} pagination={pagination} />
      )}
    </>
  );
};
