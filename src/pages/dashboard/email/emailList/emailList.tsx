import { useQuery } from "@tanstack/react-query";
import { notificatioService } from "@/services/api/notificationService";
import { getColumns } from "./emailListColumns";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { useState } from "react";
import type { PaginationState } from "@tanstack/react-table";

export const EmailList = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const findAllClientQuery = useQuery({
    queryKey: ["emails", pagination],
    queryFn: () =>
      notificatioService.findAllEmails({
        query: { page: pagination.pageIndex + 1, take: pagination.pageSize },
      }),
  });

  const emailsList = findAllClientQuery.data;

  const columns = getColumns();

  return (
    <>
      <div className="flex justify-between">
        <h1>Lista de emails</h1>
      </div>
      {findAllClientQuery.isLoading && <p>Loading...</p>}
      {findAllClientQuery.isError && <p>Error fetching emails</p>}
      {emailsList && (
        <DataTablePaginate
          columns={columns}
          data={emailsList}
          onPaginationChange={setPagination}
          pagination={pagination}
        />
      )}
    </>
  );
};
