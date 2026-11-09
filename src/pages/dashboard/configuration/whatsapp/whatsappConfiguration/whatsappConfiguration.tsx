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

  const { used, limit } = findNumberUsageQuery.data;
  const isAtLimit = limit !== null && used >= limit;

  const columns = getColumns(clientId!);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Números de WhatsApp</CardTitle>
          <CardDescription>
            Conecte os números que recebem e enviam mensagens. Pela Meta, as credenciais são configuradas automaticamente.
          </CardDescription>
          {limit !== null && (
            <p className={cn("mt-2 text-sm", isAtLimit ? "text-destructive" : "text-muted-foreground")}>
              {used} de {limit} {limit === 1 ? "número" : "números"} do plano
              {isAtLimit &&
                ". Para conectar outro, fale com o seu implantador. Ainda dá para reconectar pela Meta um número já cadastrado."}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <DialogCreateWhatsappConfiguration clientId={clientId!} disabled={isAtLimit} />
          <WhatsappEmbeddedSignupButton />
        </div>
      </CardHeader>
      <CardContent>
        {listWhatsappConfigurations.total === 0 ? (
          <EmptyState title="Nenhum número conectado" description='Comece por "Conectar com a Meta".' />
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
