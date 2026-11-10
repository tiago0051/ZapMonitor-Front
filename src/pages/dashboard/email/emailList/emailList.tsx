import { ErrorState, LoadingState } from "@/components/state-message";
import { useQuery } from "@tanstack/react-query";
import { getColumns } from "./emailListColumns";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { useState } from "react";
import type { PaginationState } from "@tanstack/react-table";
import { emailService } from "@/services/api/emailService";
import { useClientContext } from "@/context/ClientContext/clientContext";

export const EmailList = () => {
  const { client } = useClientContext();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const findAllClientQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["emails", client.id, pagination],
    queryFn: () =>
      emailService.findAllEmails({
        query: { page: pagination.pageIndex + 1, take: pagination.pageSize },
        params: {
          clientId: client.id,
        },
      }),
  });

  const emailsList = findAllClientQuery.data;

  const columns = getColumns();

  return (
    <div>
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
