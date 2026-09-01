import {
  type ColumnDef,
  rowSelectionFeature,
  type RowData,
  tableFeatures,
} from "@tanstack/react-table";

export const dataTableFeatures = tableFeatures({ rowSelectionFeature });

export type DataTableColumnDef<
  TData extends RowData,
  TValue = unknown,
> = ColumnDef<typeof dataTableFeatures, TData, TValue>;
