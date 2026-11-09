import { EmptyState } from "@/components/state-message";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getColumns } from "./whatsappConfigurationColumns";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { useState } from "react";
import type { PaginationState } from "@tanstack/react-table";
import { whatsappService } from "@/services/api/whatsappService";
import { useParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogCreateWhatsappConfiguration } from "./components/dialogCreateWhatsappConfiguration";
import { WhatsappEmbeddedSignupButton } from "../whatsappEmbeddedSignup/whatsappEmbeddedSignup";
import { WhatsappWebConnectButton } from "./components/whatsappWebConnectButton";

export const WhatsappConfiguration = () => {
  const { clientId } = useParams();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const findAllWhatsappConfigurationsQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["whatsappConfigurations", clientId, pagination],
    queryFn: () =>
      whatsappService.findAllConfigurations({
        queries: { page: pagination.pageIndex + 1, take: pagination.pageSize },
        params: {
          clientId: clientId!,
        },
      }),
  });

  const listWhatsappConfigurations = findAllWhatsappConfigurationsQuery.data;

  // Fica sob a chave dos números para ser atualizado quando um número é conectado
  const findNumberUsageQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["whatsappConfigurations", clientId, "usage"],
    queryFn: () => whatsappService.findNumberUsage({ params: { clientId: clientId! } }),
  });

  const { used, limit, whatsappWeb } = findNumberUsageQuery.data;
  // API oficial e QR code têm limites separados no plano
  const isAtLimit = limit !== null && used >= limit;
  const isWhatsappWebAtLimit = whatsappWeb.limit !== null && whatsappWeb.used >= whatsappWeb.limit;

  const usageParts = [
    limit !== null && `${used} de ${limit} ${limit === 1 ? "número" : "números"} da API oficial`,
    whatsappWeb.limit !== null && `${whatsappWeb.used} de ${whatsappWeb.limit} por QR code`,
  ].filter(Boolean);

  const columns = getColumns(clientId!);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Números de WhatsApp</CardTitle>
          <CardDescription>
            Conecte os números que recebem e enviam mensagens. Pela Meta, as credenciais são configuradas automaticamente; por QR code, basta
            ler o código no celular.
          </CardDescription>
          {usageParts.length > 0 && (
            <p className={cn("mt-2 text-sm", isAtLimit || isWhatsappWebAtLimit ? "text-destructive" : "text-muted-foreground")}>
              {usageParts.join(" · ")}
              {isAtLimit &&
                ". Para conectar outro pela API oficial, fale com o seu implantador. Ainda dá para reconectar pela Meta um número já cadastrado"}
              {isWhatsappWebAtLimit && ". Para conectar outro por QR code, fale com o seu implantador"}
              {(isAtLimit || isWhatsappWebAtLimit) && "."}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <DialogCreateWhatsappConfiguration clientId={clientId!} disabled={isAtLimit} />
          <WhatsappEmbeddedSignupButton />
          <WhatsappWebConnectButton clientId={clientId!} disabled={isWhatsappWebAtLimit} />
        </div>
      </CardHeader>
      <CardContent>
        {listWhatsappConfigurations.total === 0 ? (
          <EmptyState title="Nenhum número conectado" description='Comece por "Conectar com a Meta" ou "Conectar por QR code".' />
        ) : (
          <DataTablePaginate
            columns={columns}
            data={listWhatsappConfigurations}
            onPaginationChange={setPagination}
            pagination={pagination}
          />
        )}
      </CardContent>
    </Card>
  );
};
