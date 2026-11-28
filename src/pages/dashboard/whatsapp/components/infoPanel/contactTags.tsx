import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Tag, X } from "lucide-react";
import { useMemo, useState, type FC } from "react";

/**
 * Etiquetas da conversa, editáveis por quem atende: tira no X e põe pelo "Adicionar". A troca vai inteira para o
 * servidor, que avisa as outras telas pelo socket.
 */
export const ContactTags: FC<{ contactId: string; categories: WhatsappMessageCategoryShort[] }> = ({ contactId, categories }) => {
  const { client, can } = useClientContext();
  const canEdit = can("whatsapp.chat");
  // Troca feita aqui aparece na hora; quando chega uma versão nova do servidor (socket ou recarga), ela vale
  const [pending, setPending] = useState<{ base: WhatsappMessageCategoryShort[]; next: WhatsappMessageCategoryShort[] } | null>(null);
  const tags = pending && pending.base === categories ? pending.next : categories;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["whatsappCategories", client.id, "contactTags"],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByClient({ params: { clientId: client.id }, queries: { page: 1, take: 200, text: "" } }),
    enabled: canEdit && isOpen,
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: (next: WhatsappMessageCategoryShort[]) =>
      whatsappService.updateLinkCategoryToContact({
        params: { clientId: client.id, contactId },
        body: next.map((tag) => tag.id),
      }),
    onMutate: (next) => setPending({ base: categories, next }),
    onError: (error) => {
      setPending(null);
      requestErrorHandling(error);
    },
  });

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (categoriesQuery.data?.items ?? []).filter(
      (category) => !tags.some((tag) => tag.id === category.id) && (!term || category.name.toLowerCase().includes(term)),
    );
  }, [categoriesQuery.data, tags, search]);

  if (!canEdit && tags.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">Etiquetas</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="text-foreground bg-muted inline-flex items-center gap-1 rounded-lg py-1 pr-1 pl-2 text-[11px] font-medium"
          >
            <Tag className="text-muted-foreground h-2.5 w-2.5" />
            {tag.name}
            {canEdit && (
              <button
                type="button"
                aria-label={`Tirar a etiqueta ${tag.name}`}
                disabled={save.isPending}
                onClick={() => save.mutate(tags.filter((item) => item.id !== tag.id))}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded p-0.5 outline-none focus-visible:ring-[3px] disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {canEdit && (
          <Popover
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) setSearch("");
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-[11px]" disabled={save.isPending}>
                <Plus className="h-3 w-3" />
                Adicionar
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-2">
              <Input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar etiqueta"
                aria-label="Buscar etiqueta"
                className="mb-2 h-8 text-xs"
              />
              <div className="max-h-56 overflow-y-auto">
                {categoriesQuery.isLoading ? (
                  <p className="text-muted-foreground px-2 py-1.5 text-xs">Carregando...</p>
                ) : categoriesQuery.isError ? (
                  <p className="text-destructive px-2 py-1.5 text-xs">Não foi possível carregar as etiquetas.</p>
                ) : available.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-1.5 text-xs">
                    {categoriesQuery.data?.items.length
                      ? "Nenhuma outra etiqueta encontrada."
                      : "Nenhuma etiqueta cadastrada. Crie em Configurações › Mensagens › Categorias."}
                  </p>
                ) : (
                  available.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        save.mutate([...tags, { id: category.id, name: category.name }]);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className="hover:bg-muted focus-visible:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs outline-none"
                    >
                      <Tag className="text-muted-foreground h-3 w-3" />
                      {category.name}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
