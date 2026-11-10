import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { whatsappService } from "@/services/api/whatsappService";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { useDeferredValue, useState } from "react";
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
  const [debouncedSearch, setTextSearch] = useDebounceValue<string>("", globalContants.DEBOUNCE_DELAY);
  // Mantém a lista atual na tela enquanto a busca carrega, sem cair no esqueleto do Suspense
  const textSearch = useDeferredValue(debouncedSearch);

  const findAllWhatsappCategoriesQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
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
        <CardDescription>Etiquetas aplicadas aos contatos durante o atendimento para organizar e filtrar conversas.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 items-end gap-4 sm:grid-cols-6 lg:grid-cols-8">
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="space-y-2">
              <Label htmlFor="category-search">Buscar</Label>
              <Input
                id="category-search"
                name="search"
                type="search"
                placeholder="Nome da categoria"
                onChange={(event) => {
                  setTextSearch(event.currentTarget.value);
                  setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }));
                }}
              />
            </div>
          </div>
          <DialogCreateMessageCategory clientId={clientId!} className="sm:col-span-2 sm:col-start-5 lg:col-start-8" />
        </div>
        <DataTablePaginate columns={columns} data={listWhatsappCategories} onPaginationChange={setPagination} pagination={pagination} />
      </CardContent>
    </Card>
  );
};
