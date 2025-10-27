import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export const getColumns = () => {
  const columns: ColumnDef<WhatsappMessageCategory>[] = [
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
