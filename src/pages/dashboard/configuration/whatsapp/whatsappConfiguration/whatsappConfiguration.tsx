import { useSuspenseQuery } from "@tanstack/react-query";
import { getColumns } from "./whatsappConfigurationColumns";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { useState } from "react";
import type { PaginationState } from "@tanstack/react-table";
import { whatsappService } from "@/services/api/whatsappService";
import { useParams } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DialogCreateWhatsappConfiguration } from "./components/dialogCreateWhatsappConfiguration";

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

  const columns = getColumns();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do WhatsApp</CardTitle>
        <CardDescription>
          Gerencie as configurações do WhatsApp para este cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-6 lg:grid-cols-8 items-end gap-4">
          <div className="col-span-2 lg:col-span-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <Input name="search" placeholder="Digite o número do WhatsApp" />
            </div>
          </div>
          <DialogCreateWhatsappConfiguration
            clientId={clientId!}
            className="col-start-5 col-span-2 lg:col-start-8"
          />
        </div>
        {findAllWhatsappConfigurationsQuery.isLoading && <p>Loading...</p>}
        {findAllWhatsappConfigurationsQuery.isError && (
          <p>Error fetching emails</p>
        )}
        {listWhatsappConfigurations && (
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
