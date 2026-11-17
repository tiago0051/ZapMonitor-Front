import { Badge } from "@/components/ui/badge";
import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { format } from "date-fns";
import { MissingSetup } from "./components/missingSetup";
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
      id: "flow",
      header: "Fluxo",
      cell: ({ row }) => {
        const { flow } = row.original;
        if (!flow) return <MissingSetup label="Sem fluxo" hint="Sem fluxo ativo o número não responde ninguém. Escolha o número em um fluxo." />;
        if (!flow.active)
          return <MissingSetup label={`${flow.name} (desativado)`} hint="O fluxo deste número está desativado. Ative-o para responder os contatos." />;
        return <span className="text-sm">{flow.name}</span>;
      },
    },
    {
      id: "serviceGroup",
      header: "Grupo",
      cell: ({ row }) => {
        const { serviceGroup } = row.original;
        if (!serviceGroup)
          return <MissingSetup label="Sem grupo" hint="Sem grupo, quem pede um atendente não cai na fila de ninguém. Escolha o número em um grupo." />;
        if (serviceGroup.memberCount === 0)
          return <MissingSetup label={`${serviceGroup.name} (sem pessoas)`} hint="O grupo não tem ninguém para atender. Adicione pessoas ao grupo." />;
        return <span className="text-sm">{serviceGroup.name}</span>;
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
