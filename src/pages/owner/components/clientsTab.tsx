import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { globalContants } from "@/contants/globalContants";
import { useIsMobile } from "@/hooks/use-mobile";
import { ownerService } from "@/services/api/ownerService";
import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { format } from "date-fns";
import { useState, type FC } from "react";
import { useDebounceValue } from "usehooks-ts";
import { formatNumber } from "../ownerFormat";
import { DialogChangeImplanter } from "./dialogChangeImplanter";

const WITHOUT_IMPLANTER = "none";

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm";

const ImplanterName = ({ client }: { client: OwnerClient }) =>
  client.implanter ? <span>{client.implanter.name}</span> : <span className="text-muted-foreground italic">Sem responsável</span>;

const columns: DataTablePaginateColumnDef<OwnerClient>[] = [
  { accessorKey: "name", header: "Tenant" },
  { header: "Responsável", cell: ({ row }) => <ImplanterName client={row.original} /> },
  { accessorKey: "createdAt", header: "Criado em", cell: ({ row }) => format(row.original.createdAt, "dd/MM/yyyy") },
  { accessorKey: "activeUsers", header: "Usuários ativos", cell: ({ row }) => formatNumber(row.original.activeUsers) },
  { accessorKey: "messages", header: "Mensagens no período", cell: ({ row }) => formatNumber(row.original.messages) },
  { accessorKey: "services", header: "Atendimentos no período", cell: ({ row }) => formatNumber(row.original.services) },
  { header: "Ações", cell: ({ row }) => <DialogChangeImplanter client={row.original} /> },
];

type ClientsTabProps = {
  period: OwnerPeriodRequestQuery;
  implanters: OwnerImplanter[];
  implanterFilter: string;
  onImplanterFilterChange: (implanterUserId: string) => void;
};

export const ClientsTab: FC<ClientsTabProps> = ({ period, implanters, implanterFilter, onImplanterFilterChange }) => {
  const isMobile = useIsMobile();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = useDebounceValue<string>("", globalContants.DEBOUNCE_DELAY);

  // Outro filtro devolve outra lista; volta para a primeira página
  const filterKey = `${search}|${implanterFilter}`;
  const [lastFilterKey, setLastFilterKey] = useState<string>(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  const findClientsQuery = useQuery({
    queryKey: ["owner", "clients", period, pagination, search, implanterFilter],
    queryFn: () =>
      ownerService.findClients({
        queries: {
          ...period,
          page: pagination.pageIndex + 1,
          take: pagination.pageSize,
          search,
          implanterUserId: implanterFilter || undefined,
        },
      }),
  });

  const clients = findClientsQuery.data;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <div className="space-y-2 sm:col-span-4">
          <Label htmlFor="owner-client-search">Buscar</Label>
          <Input
            id="owner-client-search"
            placeholder="Buscar pelo nome do tenant"
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="owner-client-implanter">Responsável</Label>
          <select
            id="owner-client-implanter"
            value={implanterFilter}
            onChange={(event) => onImplanterFilterChange(event.target.value)}
            className={selectClassName}
          >
            <option value="">Todos</option>
            <option value={WITHOUT_IMPLANTER}>Sem responsável</option>
            {implanters.map((implanter) => (
              <option key={implanter.id} value={implanter.id}>
                {implanter.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {findClientsQuery.isLoading && <p>Carregando...</p>}
      {findClientsQuery.isError && <p>Erro ao buscar tenants.</p>}

      {clients && isMobile && (
        <div className="space-y-3">
          {clients.items.length === 0 && <p className="text-muted-foreground text-sm">Nenhum tenant encontrado.</p>}

          {clients.items.map((client) => (
            <Card key={client.id} className="gap-3">
              <CardHeader>
                <CardTitle>{client.name}</CardTitle>
                <CardDescription>
                  <ImplanterName client={client} /> · criado em {format(client.createdAt, "dd/MM/yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Usuários</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(client.activeUsers)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Mensagens</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(client.messages)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Atendimentos</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(client.services)}</dd>
                  </div>
                </dl>
                <DialogChangeImplanter client={client} />
              </CardContent>
            </Card>
          ))}

          {(clients.canPreviousPage || clients.canNextPage) && (
            <Pagination className="pt-2">
              <PaginationContent>
                {clients.canPreviousPage && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))} />
                  </PaginationItem>
                )}
                <PaginationItem>{pagination.pageIndex + 1}</PaginationItem>
                {clients.canNextPage && (
                  <PaginationItem>
                    <PaginationNext onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {clients && !isMobile && (
        <DataTablePaginate columns={columns} data={clients} onPaginationChange={setPagination} pagination={pagination} />
      )}
    </>
  );
};
