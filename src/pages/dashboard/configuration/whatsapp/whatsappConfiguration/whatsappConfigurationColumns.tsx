import { Badge } from "@/components/ui/badge";
import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { format } from "date-fns";
import parsePhoneNumber from "libphonenumber-js";
import { DialogManageWhatsappConfiguration } from "./components/dialogManageWhatsappConfiguration";

export const getColumns = (clientId: string) => {
  const columns: DataTablePaginateColumnDef<WhatsappConfiguration>[] = [
    {
      accessorKey: "phoneNumber",
      header: "Número",
      cell: ({ row }) => {
        const phoneNumber: string = row.getValue("phoneNumber");

        return parsePhoneNumber(phoneNumber)?.format("INTERNATIONAL") ?? phoneNumber;
      },
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => {
        const enabled: boolean = row.getValue("enabled");

        return <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Ativo" : "Desativado"}</Badge>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Conectado em",
      cell: ({ row }) => {
        const createdAt: Date = row.getValue("createdAt");
        return format(createdAt, "dd/MM/yyyy HH:mm");
      },
    },
    {
      header: "",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DialogManageWhatsappConfiguration clientId={clientId} whatsappConfiguration={row.original} />
        </div>
      ),
    },
  ];

  return columns;
};
