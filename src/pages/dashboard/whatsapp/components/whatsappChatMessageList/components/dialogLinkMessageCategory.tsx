import { Button } from "@/components/ui/button";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { globalContants } from "@/contants/globalContants";
import { whatsappService } from "@/services/api/whatsappService";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { getColumns } from "./whatsappCategoryColumns";
import { Input } from "@/components/ui/input";
import { requestErrorHandling } from "@/utils/request";
import { useClientContext } from "@/context/ClientContext/clientContext";

type DialogLinkMessageCategoryProps = {
  contactMessage: WhatsappContactMessage;
  categories: WhatsappMessageCategory[];
};

export const DialogLinkMessageCategory = ({ contactMessage, categories }: DialogLinkMessageCategoryProps) => {
  const { client } = useClientContext();

  const [isOpen, setIsOpen] = useState(false);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [textSearch, setTextSearch] = useDebounceValue<string>("", globalContants.DEBOUNCE_DELAY);

  const [categoryIdsSelected, setCategoryIdsSelected] = useState<string[]>(categories.map((cat) => cat.id));

  const findAllWhatsappCategoriesQuery = useQuery({
    queryKey: ["whatsappCategories", contactMessage, pagination, textSearch],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByClient({
        queries: {
          page: pagination.pageIndex + 1,
          take: pagination.pageSize,
          text: textSearch,
        },
        params: {
          clientId: contactMessage.clientId,
        },
      }),
    enabled: isOpen,
  });

  const updateLinkCategoryToContactMutation = useMutation({
    mutationFn: whatsappService.updateLinkCategoryToContact,
    onError: requestErrorHandling,
    onSuccess: () => {
      findAllWhatsappCategoriesQuery.refetch();
      setIsOpen(false);
    },
  });

  const listWhatsappCategories = findAllWhatsappCategoriesQuery.data;

  function onSelectCategory(categoryId: string) {
    const alreadySelected = categoryIdsSelected.includes(categoryId);

    let newCategoryIdsSelected: string[] = [];
    if (alreadySelected) {
      newCategoryIdsSelected = categoryIdsSelected.filter((id) => id !== categoryId);
    } else {
      newCategoryIdsSelected = [...categoryIdsSelected, categoryId];
    }

    setCategoryIdsSelected(newCategoryIdsSelected);
  }

  const columns = getColumns({
    onSelectCategory,
    categoryIdsSelected,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={"outline"}>Categorias</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Categorias</DialogTitle>
          <DialogDescription>Adicionar uma categoria para esta conversa.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="mb-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <Input
                name="search"
                placeholder="Digite o nome da categoria"
                onChange={(event) => setTextSearch(event.currentTarget.value)}
              />
            </div>
          </div>

          {findAllWhatsappCategoriesQuery.isLoading && <p>Loading...</p>}
          {findAllWhatsappCategoriesQuery.isError && <p>Error fetching emails</p>}
          {listWhatsappCategories && (
            <DataTablePaginate columns={columns} data={listWhatsappCategories} onPaginationChange={setPagination} pagination={pagination} />
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={updateLinkCategoryToContactMutation.isPending}
            onClick={() =>
              updateLinkCategoryToContactMutation.mutate({
                body: categoryIdsSelected,
                params: {
                  contactId: contactMessage.id,
                  clientId: client.id,
                },
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
