import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { whatsappService } from "@/services/api/whatsappService";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { useParams } from "react-router";
import { getColumns } from "./whatsappCategoryColumns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { useDebounceValue } from "usehooks-ts";
import { globalContants } from "@/contants/globalContants";
import { DialogCreateMessageCategory } from "./components/dialogCreateMessageCategory";

export const WhatsappCategory = () => {
  const { clientId } = useParams();

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [textSearch, setTextSearch] = useDebounceValue<string>(
    "",
    globalContants.DEBOUNCE_DELAY
  );

  const findAllWhatsappCategoriesQuery = useSuspenseQuery({
    queryKey: ["whatsappCategories", clientId, pagination, textSearch],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByClient({
        queries: {
          page: pagination.pageIndex + 1,
          take: pagination.pageSize,
          text: textSearch,
        },
        params: {
          clientId: clientId!,
        },
      }),
  });

  const listWhatsappCategories = findAllWhatsappCategoriesQuery.data;

  const columns = getColumns();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorias</CardTitle>
        <CardDescription>
          Gerencie as categorias do WhatsApp para este cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-6 lg:grid-cols-8 items-end gap-4">
          <div className="col-span-2 lg:col-span-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <Input
                name="search"
                placeholder="Digite o número do WhatsApp"
                onChange={(event) => setTextSearch(event.currentTarget.value)}
              />
            </div>
          </div>
          <DialogCreateMessageCategory
            clientId={clientId!}
            className="col-start-5 col-span-2 lg:col-start-8"
          />
        </div>
        {findAllWhatsappCategoriesQuery.isLoading && <p>Loading...</p>}
        {findAllWhatsappCategoriesQuery.isError && <p>Error fetching emails</p>}
        {listWhatsappCategories && (
          <DataTablePaginate
            columns={columns}
            data={listWhatsappCategories}
            onPaginationChange={setPagination}
            pagination={pagination}
          />
        )}
      </CardContent>
    </Card>
  );
};
