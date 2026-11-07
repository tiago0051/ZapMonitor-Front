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
        const { sendAt, error } = row.original;
        if (sendAt) return format(new Date(sendAt), "dd/MM/yyyy HH:mm");
        if (error)
          return (
            <span className="text-destructive" title={error}>
              Não enviado: {error.length > 80 ? `${error.slice(0, 80)}…` : error}
            </span>
          );
        return <span className="text-muted-foreground">Na fila</span>;
      },
    },
  ];

  return columns;
};
