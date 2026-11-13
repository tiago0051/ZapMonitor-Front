import { PlanStatusBadge } from "@/components/plan/planRenewalFields";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
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
import { ClientAdSegmentSelect } from "./clientAdSegmentSelect";
import { DialogChangeImplanter } from "./dialogChangeImplanter";
import { DialogClientPlan } from "./dialogClientPlan";
import { DialogDeleteClient } from "./dialogDeleteClient";

const WITHOUT_IMPLANTER = "none";

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm";

const ImplanterName = ({ client }: { client: OwnerClient }) =>
  client.implanter ? <span>{client.implanter.name}</span> : <span className="text-muted-foreground italic">Sem responsável</span>;

const ClientName = ({ client }: { client: OwnerClient }) => (
  <span className="inline-flex flex-wrap items-center gap-2">
    {client.name}
    {client.deletingAt && <Badge variant="destructive">Excluindo</Badge>}
  </span>
);

// Um tenant sendo excluído só aceita retomar a exclusão
const ClientActions = ({ client }: { client: OwnerClient }) => (
  <div className="flex flex-wrap gap-1">
    {!client.deletingAt && (
      <>
        <DialogClientPlan client={client} />
        <DialogChangeImplanter client={client} />
      </>
    )}
    <DialogDeleteClient client={client} />
  </div>
);

const columns: DataTablePaginateColumnDef<OwnerClient>[] = [
  { header: "Tenant", cell: ({ row }) => <ClientName client={row.original} /> },
  { header: "Responsável", cell: ({ row }) => <ImplanterName client={row.original} /> },
  {
    header: "Segmento",
    cell: ({ row }) => (row.original.deletingAt ? "—" : <ClientAdSegmentSelect client={row.original} />),
  },
  { header: "Vencimento", cell: ({ row }) => (row.original.plan ? <PlanStatusBadge status={row.original.plan} /> : "—") },
  { accessorKey: "createdAt", header: "Criado em", cell: ({ row }) => format(row.original.createdAt, "dd/MM/yyyy") },
  { accessorKey: "activeUsers", header: "Usuários ativos", cell: ({ row }) => formatNumber(row.original.activeUsers) },
  { accessorKey: "messages", header: "Mensagens no período", cell: ({ row }) => formatNumber(row.original.messages) },
  { accessorKey: "services", header: "Atendimentos no período", cell: ({ row }) => formatNumber(row.original.services) },
  {
    header: "Ações",
    cell: ({ row }) => <ClientActions client={row.original} />,
  },
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
    meta: { errorHandledInline: true },
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

      {findClientsQuery.isLoading && <LoadingState />}
      {findClientsQuery.isError && (
        <ErrorState
          message="Não foi possível buscar os tenants."
          onRetry={() => findClientsQuery.refetch()}
          isRetrying={findClientsQuery.isFetching}
        />
      )}

      {clients && isMobile && (
        <div className="space-y-3">
          {clients.items.length === 0 && <EmptyState title="Nenhum tenant encontrado" />}

          {clients.items.map((client) => (
            <Card key={client.id} className="gap-3">
              <CardHeader>
                <CardTitle>
                  <ClientName client={client} />
                </CardTitle>
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
                {!client.deletingAt && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm">Segmento dos anúncios</p>
                    <ClientAdSegmentSelect client={client} className="w-full max-w-none" />
                  </div>
                )}
                <ClientActions client={client} />
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
