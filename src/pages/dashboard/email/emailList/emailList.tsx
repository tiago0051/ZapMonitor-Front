import { ErrorState, LoadingState } from "@/components/state-message";
import { useQuery } from "@tanstack/react-query";
import { getColumns } from "./emailListColumns";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { useState } from "react";
import type { PaginationState } from "@tanstack/react-table";
import { emailService } from "@/services/api/emailService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { Input } from "@/components/ui/input";
import { useDebounceValue } from "usehooks-ts";
import { Search } from "lucide-react";

export const EmailList = () => {
  const { client } = useClientContext();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search] = useDebounceValue(searchInput.trim(), 400);

  const findAllClientQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["emails", client.id, pagination, search],
    queryFn: () =>
      emailService.findAllEmails({
        query: { page: pagination.pageIndex + 1, take: pagination.pageSize, search: search || undefined },
        params: {
          clientId: client.id,
        },
      }),
  });

  const emailsList = findAllClientQuery.data;

  const columns = getColumns();

  return (
    <div className="grid gap-3">
      <div className="relative sm:w-72">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
        <Input
          id="email-recipient-search"
          type="search"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
          placeholder="Buscar por destinatário"
          aria-label="Buscar e-mail por destinatário"
          className="pl-8"
        />
      </div>
      {findAllClientQuery.isLoading && <LoadingState />}
      {findAllClientQuery.isError && (
        <ErrorState
          message="Não foi possível buscar os e-mails."
          onRetry={() => findAllClientQuery.refetch()}
          isRetrying={findAllClientQuery.isFetching}
        />
      )}
      {emailsList && <DataTablePaginate columns={columns} data={emailsList} onPaginationChange={setPagination} pagination={pagination} />}
    </div>
  );
};
