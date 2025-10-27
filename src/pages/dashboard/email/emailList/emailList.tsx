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
    queryKey: ["emails", pagination],
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
    <>
      <div className="flex justify-between">
        <h1>Lista de emails</h1>
      </div>
      {findAllClientQuery.isLoading && <p>Loading...</p>}
      {findAllClientQuery.isError && <p>Error fetching emails</p>}
      {emailsList && <DataTablePaginate columns={columns} data={emailsList} onPaginationChange={setPagination} pagination={pagination} />}
    </>
  );
};
