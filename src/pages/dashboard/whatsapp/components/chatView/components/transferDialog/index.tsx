import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound, Users } from "lucide-react";
import { useMemo, useState, type FC } from "react";
import type { ServiceActions } from "../../hooks/useServiceActions";

// Mesmo limite do back-end
const TRANSFER_NOTE_MAX_LENGTH = 500;

type TransferTarget = "user" | "group";

type TransferDialogProps = {
  contact: Pick<WhatsappContactMessage, "id">;
  contactName: string;
  serviceActions: ServiceActions;
};

const textareaClassName =
  "border-input bg-background focus-visible:ring-ring w-full resize-y rounded-md border px-3 py-2 text-base focus-visible:ring-1 focus-visible:outline-none md:text-sm";

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();

/** Conteúdo do diálogo; montado só enquanto está aberto, então cada abertura começa limpa. */
const TransferForm: FC<TransferDialogProps & { onDone: () => void }> = ({ contact, contactName, serviceActions, onDone }) => {
  const { client } = useClientContext();
  const [target, setTarget] = useState<TransferTarget>("user");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const optionsQuery = useQuery({
    queryKey: ["whatsapp", "transferOptions", contact.id],
    queryFn: () => whatsappService.findTransferOptions({ params: { clientId: client.id, contactId: contact.id } }),
    staleTime: 0,
    meta: { errorHandledInline: true },
  });

  const options = optionsQuery.data;

  // Online primeiro, depois quem é do grupo do contato, depois por nome
  const users = useMemo(() => {
    const term = normalize(search.trim());
    return [...(options?.users ?? [])]
      .filter((user) => !term || normalize(user.name).includes(term))
      .sort(
        (first, second) =>
          Number(second.online) - Number(first.online) ||
          Number(second.isServiceGroupMember) - Number(first.isServiceGroupMember) ||
          first.name.localeCompare(second.name, "pt-BR"),
      );
  }, [options?.users, search]);

  const groups = useMemo(() => {
    const term = normalize(search.trim());
    return (options?.serviceGroups ?? [])
      .filter((group) => !term || normalize(group.name).includes(term))
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  }, [options?.serviceGroups, search]);

  const selectedUser = target === "user" ? users.find((user) => user.id === selectedId) : undefined;
  const selectedGroup = target === "group" ? groups.find((group) => group.id === selectedId) : undefined;
  const canConfirm = !!(selectedUser || selectedGroup) && !serviceActions.isPending;

  function changeTarget(next: string) {
    setTarget(next as TransferTarget);
    setSelectedId(null);
  }

  function confirm() {
    const trimmedNote = note.trim() || undefined;
    if (selectedUser) serviceActions.transferToUser(selectedUser, trimmedNote);
    else if (selectedGroup) serviceActions.transferToGroup(selectedGroup, trimmedNote);
    else return;
    onDone();
  }

  function renderList() {
    if (optionsQuery.isLoading) return <LoadingState label="Carregando equipe..." />;
    if (optionsQuery.isError)
      return (
        <ErrorState
          message="Não foi possível carregar a equipe."
          onRetry={() => optionsQuery.refetch()}
          isRetrying={optionsQuery.isFetching}
        />
      );

    if (target === "user") {
      if (users.length === 0)
        return (
          <EmptyState
            className="border-0"
            icon={UserRound}
            title={search ? "Ninguém encontrado" : "Nenhum colega disponível"}
            description={search ? undefined : "Só aparecem pessoas da equipe com acesso ao atendimento."}
          />
        );

      return users.map((user) => (
        <button
          key={user.id}
          type="button"
          role="radio"
          aria-checked={selectedId === user.id}
          onClick={() => setSelectedId(user.id)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
            selectedId === user.id ? "bg-primary/10 ring-primary ring-1" : "hover:bg-muted",
          )}
        >
          <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", user.online ? "bg-green-500" : "bg-muted-foreground/30")} />
          <span className="min-w-0 flex-1 truncate font-medium">{user.name}</span>
          {user.isServiceGroupMember && (
            <span className="text-muted-foreground bg-muted shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">do grupo</span>
          )}
          <span className={cn("shrink-0 text-xs", user.online ? "text-green-600" : "text-muted-foreground")}>
            {user.online ? "online" : "offline"}
          </span>
        </button>
      ));
    }

    if (groups.length === 0)
      return (
        <EmptyState
          className="border-0"
          icon={Users}
          title={search ? "Nenhum grupo encontrado" : "Nenhum grupo de atendimento"}
          description={search ? undefined : "Crie grupos em Configurações para dividir a fila por equipe."}
        />
      );

    return groups.map((group) => (
      <button
        key={group.id}
        type="button"
        role="radio"
        aria-checked={selectedId === group.id}
        onClick={() => setSelectedId(group.id)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          selectedId === group.id ? "bg-primary/10 ring-primary ring-1" : "hover:bg-muted",
        )}
      >
        <Users className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-medium">
          {group.name}
          {options?.currentServiceGroupId === group.id && <span className="text-muted-foreground font-normal"> (grupo atual)</span>}
        </span>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {group.onlineCount}/{group.memberCount} online
        </span>
      </button>
    ));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Transferir atendimento</DialogTitle>
        <DialogDescription>
          Passe {contactName} para um colega ou para a fila de um grupo. Quem recebe é avisado e vê a sua nota.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-w-0 gap-3">
        <Tabs value={target} onValueChange={changeTarget}>
          <TabsList className="w-full">
            <TabsTrigger value="user">Pessoa</TabsTrigger>
            <TabsTrigger value="group">Grupo</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-1.5">
          <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={target === "user" ? "Buscar colega" : "Buscar grupo"}
            placeholder={target === "user" ? "Buscar colega" : "Buscar grupo"}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm"
          />
        </div>

        <div
          role="radiogroup"
          aria-label={target === "user" ? "Colegas" : "Grupos de atendimento"}
          className="-mx-1 max-h-[40dvh] min-h-24 space-y-1 overflow-y-auto px-1 py-1"
        >
          {renderList()}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="transfer-note">Nota para quem recebe (opcional)</Label>
          <textarea
            id="transfer-note"
            rows={2}
            maxLength={TRANSFER_NOTE_MAX_LENGTH}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex.: já mandei a proposta, falta confirmar o pagamento"
            className={textareaClassName}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="button" onClick={confirm} disabled={!canConfirm}>
          Transferir
        </Button>
      </DialogFooter>
    </>
  );
};

/** Transferir o atendimento para um colega (online primeiro) ou para a fila de um grupo, com nota para quem recebe. */
export const TransferDialog: FC<TransferDialogProps> = (props) => {
  const { isTransferDialogOpen, setIsTransferDialogOpen } = props.serviceActions;

  return (
    <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {isTransferDialogOpen && <TransferForm {...props} onDone={() => setIsTransferDialogOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
};
