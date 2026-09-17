import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { format } from "date-fns";

export const getColumns = () => {
  const columns: DataTablePaginateColumnDef<EmailMessage>[] = [
    {
      accessorKey: "emailTo",
      header: "Enviado para",
    },
    {
      accessorKey: "clientName",
      header: "Cliente",
    },
    {
      accessorKey: "sendAt",
      header: "Data de envio",
      cell: ({ row }) => {
        const sendAt: Date = row.getValue("sendAt");
        return format(sendAt, "dd/MM/yyyy HH:mm");
      },
    },
  ];

  return columns;
};
