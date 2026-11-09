import { Badge } from "@/components/ui/badge";
import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { format } from "date-fns";
import { DialogManageWhatsappConfiguration } from "./components/dialogManageWhatsappConfiguration";
import { WhatsappWebActions } from "./components/whatsappWebActions";
import { DeleteWhatsappConfigurationButton } from "./components/deleteWhatsappConfigurationButton";
import {
  formatConfigurationPhoneNumber,
  isWhatsappWeb,
  whatsappProviderLabel,
  whatsappWebStatusInfo,
} from "@/utils/whatsappConfiguration";

export const getColumns = (clientId: string) => {
  const columns: DataTablePaginateColumnDef<WhatsappConfiguration>[] = [
    {
      accessorKey: "phoneNumber",
      header: "Número",
      cell: ({ row }) => {
        const configuration = row.original;

        return (
          <span className={configuration.phoneNumber ? undefined : "text-muted-foreground"}>
            {formatConfigurationPhoneNumber(configuration)}
          </span>
        );
      },
    },
    {
      accessorKey: "provider",
      header: "Canal",
      cell: ({ row }) => <Badge variant="outline">{whatsappProviderLabel[row.original.provider] ?? row.original.provider}</Badge>,
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => {
        const { enabled, connectionStatus, connectionError } = row.original;
        const connection = isWhatsappWeb(row.original) && connectionStatus ? whatsappWebStatusInfo[connectionStatus] : null;

        return (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Ativo" : "Desativado"}</Badge>
            {connection && (
              <Badge variant={connection.variant} title={connectionError ?? undefined}>
                {connection.label}
              </Badge>
            )}
          </div>
        );
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
          {/* Webhook e token só existem na API oficial da Meta */}
          {isWhatsappWeb(row.original) ? (
            <WhatsappWebActions clientId={clientId} whatsappConfiguration={row.original} />
          ) : (
            <DialogManageWhatsappConfiguration clientId={clientId} whatsappConfiguration={row.original} />
          )}
          <DeleteWhatsappConfigurationButton clientId={clientId} whatsappConfiguration={row.original} />
        </div>
      ),
    },
  ];

  return columns;
};
