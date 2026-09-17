import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { globalContants } from "@/contants/globalContants";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { memberService } from "@/services/api/memberService";
import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { DialogInviteMember } from "./components/dialogInviteMember";
import { MemberCard } from "./components/memberCard";
import { getColumns } from "./membersColumns";

const STATUS_OPTIONS: { value: "" | MemberStatus; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "ACTIVE", label: "Ativos" },
  { value: "INACTIVE", label: "Inativos" },
  { value: "PENDING", label: "Convites pendentes" },
];

export const Members = () => {
  const { client } = useClientContext();
  const isMobile = useIsMobile();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = useDebounceValue<string>("", globalContants.DEBOUNCE_DELAY);
  const [status, setStatus] = useState<"" | MemberStatus>("");

  const findAllMembersQuery = useQuery({
    queryKey: ["members", client.id, pagination, search, status],
    queryFn: () =>
      memberService.findAll({
        params: { clientId: client.id },
        queries: {
          page: pagination.pageIndex + 1,
          take: pagination.pageSize,
          search,
          status: status || undefined,
        },
      }),
  });

  const members = findAllMembersQuery.data;
  const columns = getColumns(client.id);

  return (
    <div className="flex max-h-full flex-col gap-4 overflow-hidden p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Usuários</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-8">
        <div className="sm:col-span-3 lg:col-span-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              name="search"
              placeholder="Buscar por nome ou e-mail"
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </div>
        </div>
        <div className="sm:col-span-3 lg:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as "" | MemberStatus)}
              className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogInviteMember clientId={client.id} className="w-full self-end sm:col-span-6 sm:w-auto lg:col-span-2 lg:col-start-7" />
      </div>

      {findAllMembersQuery.isLoading && <p>Carregando...</p>}
      {findAllMembersQuery.isError && <p>Erro ao buscar usuários.</p>}

      {members && isMobile && (
        <div className="space-y-3 overflow-auto">
          {members.items.length === 0 && <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>}

          {members.items.map((member) => (
            <MemberCard key={member.id} member={member} clientId={client.id} />
          ))}

          {(members.canPreviousPage || members.canNextPage) && (
            <Pagination className="pt-2">
              <PaginationContent>
                {members.canPreviousPage && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))} />
                  </PaginationItem>
                )}
                <PaginationItem>{pagination.pageIndex + 1}</PaginationItem>
                {members.canNextPage && (
                  <PaginationItem>
                    <PaginationNext onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {members && !isMobile && (
        <DataTablePaginate columns={columns} data={members} onPaginationChange={setPagination} pagination={pagination} />
      )}
    </div>
  );
};
