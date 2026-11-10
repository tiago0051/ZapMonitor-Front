import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { globalContants } from "@/contants/globalContants";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { memberService } from "@/services/api/memberService";
import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
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

  // Busca e status ficam na URL: sobrevivem a recarregar a página e a voltar de outra tela
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInput = searchParams.get("q") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const status = STATUS_OPTIONS.some((option) => option.value === statusParam) ? (statusParam as "" | MemberStatus) : "";
  const [search] = useDebounceValue(searchInput.trim(), globalContants.DEBOUNCE_DELAY);

  const updateFilter = (key: "q" | "status", value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  };

  const findAllMembersQuery = useQuery({
    meta: { errorHandledInline: true },
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
  const pageCount = Math.max(1, Math.ceil((members?.total ?? 0) / pagination.pageSize));

  return (
    <div className="flex max-h-full flex-col gap-4 overflow-hidden p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Usuários</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-8">
        <div className="sm:col-span-3 lg:col-span-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="search"
                name="search"
                type="search"
                placeholder="Buscar por nome ou e-mail"
                value={searchInput}
                onChange={(event) => updateFilter("q", event.currentTarget.value)}
                className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => updateFilter("q", "")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="sm:col-span-3 lg:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(event) => updateFilter("status", event.target.value)}
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

      {findAllMembersQuery.isLoading && <LoadingState />}
      {findAllMembersQuery.isError && (
        <ErrorState
          message="Não foi possível buscar os usuários."
          onRetry={() => findAllMembersQuery.refetch()}
          isRetrying={findAllMembersQuery.isFetching}
        />
      )}

      {members && isMobile && (
        <div className="space-y-3 overflow-auto">
          {members.items.length === 0 && <EmptyState title="Nenhum usuário encontrado" />}

          {members.items.map((member) => (
            <MemberCard key={member.id} member={member} clientId={client.id} />
          ))}

          {(members.canPreviousPage || members.canNextPage) && (
            <div className="flex items-center justify-between gap-2 pt-2 text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={!members.canPreviousPage}
                onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
              >
                Anterior
              </Button>
              <span className="text-muted-foreground tabular-nums">
                Página {pagination.pageIndex + 1} de {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!members.canNextPage}
                onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}

      {members && !isMobile && (
        <DataTablePaginate columns={columns} data={members} onPaginationChange={setPagination} pagination={pagination} />
      )}

      {members && members.total > 0 && (
        <p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
          {members.total} {members.total === 1 ? "usuário" : "usuários"}
          {pageCount > 1 && ` · Página ${pagination.pageIndex + 1} de ${pageCount}`}
        </p>
      )}
    </div>
  );
};
