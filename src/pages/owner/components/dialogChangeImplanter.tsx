import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { globalContants } from "@/contants/globalContants";
import { cn } from "@/lib/utils";
import { ownerService } from "@/services/api/ownerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";

export const DialogChangeImplanter: FC<{ client: OwnerClient }> = ({ client }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<OwnerUserSummary | null>(null);
  const [search, setSearch] = useDebounceValue<string>("", globalContants.DEBOUNCE_DELAY);
  const queryClient = useQueryClient();

  const searchUsersQuery = useQuery({
    queryKey: ["owner", "users", search],
    queryFn: () => ownerService.searchUsers({ queries: { search } }),
    enabled: isOpen,
  });

  const changeImplanter = useMutation({
    mutationFn: ownerService.changeClientImplanter,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner"] });
      toast.success("Responsável alterado com sucesso");
      setIsOpen(false);
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setSelectedUser(null);
    setSearch("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Trocar responsável
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Responsável por {client.name}</DialogTitle>
          <DialogDescription>
            O tenant passa a contar para o novo implantador, que recebe o papel Implantador nele. O responsável anterior mantém o acesso que
            tinha.
          </DialogDescription>
        </DialogHeader>

        <Input placeholder="Buscar usuário por nome ou e-mail" onChange={(event) => setSearch(event.currentTarget.value)} />

        <ul className="max-h-64 divide-y overflow-auto rounded-md border">
          {searchUsersQuery.isLoading && <li className="text-muted-foreground p-3 text-sm">Carregando...</li>}
          {searchUsersQuery.data?.length === 0 && <li className="text-muted-foreground p-3 text-sm">Nenhum usuário encontrado.</li>}
          {searchUsersQuery.data?.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => setSelectedUser(user)}
                aria-current={user.id === selectedUser?.id ? "true" : undefined}
                className={cn(
                  "w-full px-3 py-2 text-left transition-colors",
                  user.id === selectedUser?.id ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <span className="block text-sm font-medium">
                  {user.name}
                  {user.id === client.implanter?.id && <span className="text-muted-foreground font-normal"> · atual</span>}
                </span>
                <span className="text-muted-foreground block text-xs">{user.email}</span>
              </button>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button
            type="button"
            disabled={!selectedUser || selectedUser.id === client.implanter?.id || changeImplanter.isPending}
            onClick={() =>
              selectedUser && changeImplanter.mutate({ params: { clientId: client.id }, body: { implanterUserId: selectedUser.id } })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
