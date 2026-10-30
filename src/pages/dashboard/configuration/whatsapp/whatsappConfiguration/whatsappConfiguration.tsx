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

  const columns = getColumns(clientId!);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Números de WhatsApp</CardTitle>
          <CardDescription>
            Conecte os números que recebem e enviam mensagens. Pela Meta, as credenciais são configuradas automaticamente.
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <DialogCreateWhatsappConfiguration clientId={clientId!} />
          <WhatsappEmbeddedSignupButton />
        </div>
      </CardHeader>
      <CardContent>
        {listWhatsappConfigurations.total === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum número conectado. Comece por "Conectar com a Meta".</p>
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
