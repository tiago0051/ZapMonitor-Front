import { Button, buttonVariants } from "@/components/ui/button";
import { DataTablePaginate } from "@/components/ui/dataTablePaginate";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { globalContants } from "@/contants/globalContants";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { getColumns } from "./whatsappCategoryColumns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";

type DialogFilterCategoryProps = {
  onSelectCategories: (categories: WhatsappMessageCategory[]) => void;
  categories: WhatsappMessageCategory[];
};

export const DialogFilterCategory = ({ onSelectCategories, categories }: DialogFilterCategoryProps) => {
  const { client } = useClientContext();

  const [isOpen, setIsOpen] = useState(false);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [textSearch, setTextSearch] = useDebounceValue<string>("", globalContants.DEBOUNCE_DELAY);

  const [categoriesSelected, setCategoriesSelected] = useState<WhatsappMessageCategory[]>(categories);

  const findAllWhatsappCategoriesQuery = useQuery({
    queryKey: ["whatsappCategories", pagination, textSearch],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByUser({
        queries: {
          page: pagination.pageIndex + 1,
          take: pagination.pageSize,
          text: textSearch,
        },
        params: {
          clientId: client.id,
        },
      }),
    enabled: isOpen,
  });

  const listWhatsappCategories = findAllWhatsappCategoriesQuery.data;

  function onSelectCategory(category: WhatsappMessageCategory) {
    setCategoriesSelected((prev) => {
      const array = [...prev.filter((cat) => cat.id !== category.id)];

      const alreadyExists = prev.some((cat) => cat.id === category.id);
      if (!alreadyExists) array.push(category);

      return array;
    });
  }

  const columns = getColumns({
    onSelectCategory,
    categoryIdsSelected: categoriesSelected.map((cat) => cat.id),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className={cn(buttonVariants({ variant: "outline" }), "flex h-auto min-h-9 w-full flex-wrap justify-start py-0")}>
          {categories.length > 0 ? (
            <>
              {categories.map((cat) => (
                <Badge key={cat.id}>{cat.name}</Badge>
              ))}
              <Button variant={"link"} className="px-0 text-xs">
                Selecionar
              </Button>
            </>
          ) : (
            <Button variant={"link"} className="h-min px-0 py-0 text-xs">
              Selecionar categoria
            </Button>
          )}
        </div>
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
            onClick={() => {
              onSelectCategories(categoriesSelected);
              setIsOpen(false);
            }}
          >
            Filtrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
