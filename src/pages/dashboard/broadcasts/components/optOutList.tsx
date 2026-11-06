import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { broadcastService } from "@/services/api/broadcastService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { optOutSourceLabel } from "../broadcastUtils";

const TAKE = 30;

/** Quem pediu para não receber marketing; vale para todas as campanhas de marketing do tenant. */
export const OptOutList = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [page, setPage] = useState(1);
  const canEdit = can("broadcasts.send");

  const query = useQuery({
    queryKey: ["broadcastOptOuts", client.id, search, page],
    queryFn: () => broadcastService.findOptOuts(client.id, { page, take: TAKE, search: search.trim() || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["broadcastOptOuts", client.id] });

  const addMutation = useMutation({
    mutationFn: () => broadcastService.addOptOut(client.id, phone),
    onError: requestErrorHandling,
    onSuccess: () => {
      setPhone("");
      invalidate();
      toast.success("Número descadastrado");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => broadcastService.removeOptOut(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("O número volta a receber campanhas de marketing");
    },
  });

  const items = query.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / TAKE));

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground max-w-prose text-sm">
        Quem responde PARAR, SAIR ou toca em um botão com esse texto entra aqui sozinho e não recebe mais campanhas de marketing. Modelos de
        utilidade, como lembretes e cobranças, continuam chegando.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          id="opt-out-search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar número"
          className="sm:max-w-xs"
        />
        {canEdit && (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (phone.trim()) addMutation.mutate();
            }}
          >
            <Input
              id="opt-out-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="11 99999-8888"
            />
            <Button type="submit" variant="outline" disabled={!phone.trim() || addMutation.isPending}>
              Descadastrar
            </Button>
          </form>
        )}
      </div>

      {query.isLoading && <LoadingState label="Carregando..." />}
      {query.isError && (
        <ErrorState message="Não foi possível buscar a lista." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && items.length === 0 && (
        <EmptyState title="Ninguém descadastrado" description="Os pedidos para sair aparecem aqui conforme chegam." />
      )}

      {items.length > 0 && (
        <div className="divide-y rounded-xl border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium tabular-nums">{item.phoneNumber}</p>
                <p className="text-muted-foreground text-xs">
                  {optOutSourceLabel[item.source]} · {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Tirar ${item.phoneNumber} da lista`}
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-muted-foreground tabular-nums">
            {page} de {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
};
