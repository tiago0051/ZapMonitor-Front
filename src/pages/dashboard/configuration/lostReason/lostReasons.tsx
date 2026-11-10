import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

export const LostReasons = () => {
  const { clientId } = useParams();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const findAllLostReasonsQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["crm", "lostReasons", clientId],
    queryFn: () => crmService.findAllLostReasons({ params: { clientId: clientId! } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm", "lostReasons", clientId] });

  const createLostReason = useMutation({
    mutationFn: crmService.createLostReason,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      setNewName("");
      toast.success("Motivo adicionado");
    },
  });

  const updateLostReason = useMutation({
    mutationFn: crmService.updateLostReason,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success("Motivo atualizado");
    },
  });

  const setLostReasonActive = useMutation({
    mutationFn: crmService.setLostReasonActive,
    onError: requestErrorHandling,
    onSuccess: (lostReason) => {
      invalidate();
      toast.success(lostReason.active ? "Motivo reativado" : "Motivo desativado");
    },
  });

  const lostReasons = findAllLostReasonsQuery.data;
  const isPending = createLostReason.isPending || updateLostReason.isPending || setLostReasonActive.isPending;

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;

    createLostReason.mutate({ params: { clientId: clientId! }, body: { name: newName.trim() } });
  };

  const saveEditing = (lostReason: LostReason) => {
    if (!editingName.trim()) return;

    updateLostReason.mutate({ params: { clientId: clientId!, lostReasonId: lostReason.id }, body: { name: editingName.trim() } });
  };

  const toggleLostReason = async (lostReason: LostReason) => {
    if (
      lostReason.active &&
      !(await confirm({
        title: `Desativar o motivo "${lostReason.name}"?`,
        description: "Ele sai da lista ao marcar um negócio como perdido. Os negócios que já usaram este motivo não mudam.",
        confirmLabel: "Desativar",
        destructive: true,
      }))
    )
      return;
    setLostReasonActive.mutate({
      params: { clientId: clientId!, lostReasonId: lostReason.id },
      body: { active: !lostReason.active },
    });
  };

  return (
    <Card>
      {confirmDialog}
      <CardHeader>
        <CardTitle>Motivos de perda</CardTitle>
        <CardDescription>
          Ao marcar um negócio como perdido, o atendente escolhe um destes motivos ou escreve outro. Sem motivos cadastrados, o motivo é
          sempre escrito. Desativar um motivo tira ele da lista sem mudar os negócios que já o usaram.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            id="new-lost-reason"
            aria-label="Novo motivo de perda"
            value={newName}
            maxLength={120}
            disabled={isPending}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Ex.: Preço acima do orçamento"
          />
          <Button type="submit" disabled={!newName.trim() || isPending}>
            Adicionar
          </Button>
        </form>

        {lostReasons.length === 0 && (
          <EmptyState
            title="Nenhum motivo cadastrado"
            description="Cadastre os motivos mais comuns para comparar as perdas nos relatórios."
          />
        )}

        {lostReasons.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {lostReasons.map((lostReason) => (
              <li key={lostReason.id} className="flex items-center gap-2 px-3 py-2">
                {editingId === lostReason.id ? (
                  <>
                    <Input
                      aria-label="Nome do motivo"
                      value={editingName}
                      maxLength={120}
                      autoFocus
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && saveEditing(lostReason)}
                    />
                    <Button size="icon" variant="ghost" aria-label="Salvar" disabled={isPending} onClick={() => saveEditing(lostReason)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Cancelar" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={
                        lostReason.active
                          ? "min-w-0 flex-1 text-sm break-words"
                          : "text-muted-foreground min-w-0 flex-1 text-sm break-words line-through"
                      }
                    >
                      {lostReason.name}
                    </span>
                    {!lostReason.active && <Badge variant="secondary">Inativo</Badge>}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground h-8 w-8"
                      aria-label="Renomear motivo"
                      onClick={() => {
                        setEditingId(lostReason.id);
                        setEditingName(lostReason.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={isPending} onClick={() => void toggleLostReason(lostReason)}>
                      {lostReason.active ? "Desativar" : "Reativar"}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
