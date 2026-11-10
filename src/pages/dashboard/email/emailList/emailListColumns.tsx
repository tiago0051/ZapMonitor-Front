import { Badge } from "@/components/ui/badge";
import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type EmailStatus = "sent" | "queued" | "failed";

// A API não manda o status: sai da data de envio e do erro
const emailStatus = ({ sendAt, error }: EmailMessage): EmailStatus => (sendAt ? "sent" : error ? "failed" : "queued");

const statusInfo: Record<EmailStatus, { label: string; className: string }> = {
  sent: { label: "Enviado", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  queued: { label: "Na fila", className: "bg-muted text-muted-foreground" },
  failed: { label: "Falhou", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
};

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
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = emailStatus(row.original);
        const { error } = row.original;
        return (
          <div className="grid max-w-xs gap-1">
            <Badge variant="outline" className={cn("border-transparent", statusInfo[status].className)}>
              {statusInfo[status].label}
            </Badge>
            {status === "failed" && error && <span className="text-destructive line-clamp-2 text-xs whitespace-normal">{error}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "sendAt",
      header: "Data de envio",
      cell: ({ row }) => {
        const { sendAt } = row.original;
        return sendAt ? format(new Date(sendAt), "dd/MM/yyyy HH:mm") : <span className="text-muted-foreground">—</span>;
      },
    },
  ];

  return columns;
};
