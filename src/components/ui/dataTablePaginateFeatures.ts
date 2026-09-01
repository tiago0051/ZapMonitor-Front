import {
  type ColumnDef,
  createPaginatedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  type RowData,
  tableFeatures,
} from "@tanstack/react-table";

export const dataTablePaginateFeatures = tableFeatures({
  rowSelectionFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

export type DataTablePaginateColumnDef<
  TData extends RowData,
  TValue = unknown,
> = ColumnDef<typeof dataTablePaginateFeatures, TData, TValue>;
