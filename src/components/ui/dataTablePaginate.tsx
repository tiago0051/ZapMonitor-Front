"use client";

import {
  type OnChangeFn,
  type PaginationState,
  type RowData,
  useTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  dataTablePaginateFeatures,
  type DataTablePaginateColumnDef,
} from "@/components/ui/dataTablePaginateFeatures";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

interface DataTablePaginateProps<TData extends RowData> {
  columns: DataTablePaginateColumnDef<TData>[];
  data: PaginatedResponse<TData>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
}

export function DataTablePaginate<TData extends RowData>({
  columns,
  data,
  pagination,
  onPaginationChange,
}: DataTablePaginateProps<TData>) {
  const table = useTable({
    features: dataTablePaginateFeatures,
    data: data.items,
    columns,
    manualPagination: true,
    rowCount: data.total,
    onPaginationChange,
    state: {
      pagination,
    },
  });

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {table.getPageCount() > 1 && (
        <Pagination>
          <PaginationContent>
            {table.getCanPreviousPage() && (
              <PaginationItem>
                <PaginationPrevious onClick={table.previousPage} />
              </PaginationItem>
            )}
            <PaginationItem>{pagination.pageIndex + 1}</PaginationItem>
            {table.getCanNextPage() && (
              <PaginationItem>
                <PaginationNext onClick={table.nextPage} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
