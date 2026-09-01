import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { format } from "date-fns";

export const getColumns = () => {
  const columns: DataTablePaginateColumnDef<WhatsappMessageCategory>[] = [
    {
      accessorKey: "name",
      header: "Nome",
    },
    {
      accessorKey: "createdAt",
      header: "Data de criação",
      cell: ({ row }) => {
        const sendAt: Date = row.getValue("createdAt");
        return format(sendAt, "dd/MM/yyyy HH:mm");
      },
    },
  ];

  return columns;
};
