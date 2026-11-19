import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { contactService } from "@/services/api/contactService";
import { crmService } from "@/services/api/crmService";
import { dateAutomationService } from "@/services/api/dateAutomationService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatCount } from "../broadcastUtils";
import { DateAutomationForm } from "./dateAutomationForm";
import { dateAutomationActionLabel, describeDateTrigger, hourLabel } from "./dateAutomationUtils";

/** Automações por data: aniversário, vencimento, X dias depois do cadastro... com a última execução de cada uma. */
export const DateAutomationList = () => {
  const { client, can, canUseCrm } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [editing, setEditing] = useState<DateAutomation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const canEdit = can("broadcasts.send");

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["dateAutomations", client.id],
    queryFn: () => dateAutomationService.findAll(client.id),
  });
  const contactFieldsQuery = useQuery({
    queryKey: ["contacts", "fields", client.id],
    queryFn: () => contactService.findFields(client.id),
  });
  const crmFieldsQuery = useQuery({
    queryKey: ["crm", "fields", client.id],
    queryFn: () => crmService.findAllCrmFields({ params: { clientId: client.id } }),
    enabled: canUseCrm,
  });
  const fieldName = (id: string | null) =>
    [...(contactFieldsQuery.data ?? []), ...(crmFieldsQuery.data ?? [])].find((field) => field.id === id)?.name ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["dateAutomations", client.id] });
  const toggle = useMutation({
    mutationFn: (automation: DateAutomation) => dateAutomationService.setActive(client.id, automation.id, !automation.active),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      invalidate();
      toast.success(saved.active ? "Automação ligada" : "Automação pausada");
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => dateAutomationService.remove(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Automação excluída");
    },
  });

  const items = query.data ?? [];
  const openForm = (automation: DateAutomation | null) => {
    setEditing(automation);
    setFormOpen(true);
  };

  return (
    <div className="grid gap-4">
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Mensagem, sequência ou tarefa que sai sozinha alguns dias antes ou depois de uma data da ficha ou do negócio, como aniversário ou
          vencimento.
        </p>
        {canEdit && (
          <Button onClick={() => openForm(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova automação
          </Button>
        )}
      </div>

      {query.isLoading && <LoadingState label="Carregando automações..." />}
      {query.isError && (
        <ErrorState message="Não foi possível buscar as automações." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && items.length === 0 && (
        <EmptyState
          title="Nenhuma automação por data"
          description='Crie um campo do tipo data (como "Aniversário") na ficha ou no negócio e monte a automação aqui.'
        />
      )}

      {items.length > 0 && (
        <ul className="grid gap-2">
          {items.map((automation) => (
            <li key={automation.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{automation.name}</p>
                <p className="text-sm">
                  {describeDateTrigger(automation, fieldName(automation.fieldId))}, a partir das {hourLabel(automation.sendHour)} ·{" "}
                  {dateAutomationActionLabel[automation.action].toLowerCase()}
                </p>
                <p className="text-muted-foreground text-xs">
                  {automation.lastRunAt
                    ? `Última vez em ${format(new Date(automation.lastRunAt), "dd/MM 'às' HH:mm")}: ${formatCount(automation.lastRunCount ?? 0)} ${
                        automation.lastRunCount === 1 ? "pessoa" : "pessoas"
                      }`
                    : "Ainda não rodou"}
                </p>
                {automation.lastRunError && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">Problema na última vez: {automation.lastRunError}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={automation.active}
                    disabled={!canEdit || toggle.isPending}
                    onCheckedChange={() => toggle.mutate(automation)}
                    aria-label={automation.active ? "Pausar automação" : "Ligar automação"}
                  />
                  {automation.active ? "Ligada" : "Pausada"}
                </label>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="icon" aria-label="Editar automação" onClick={() => openForm(automation)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir automação"
                      disabled={remove.isPending}
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Excluir "${automation.name}"?`,
                          description: "Ela para de rodar. O que já foi enviado continua nos disparos, sequências e tarefas.",
                          confirmLabel: "Excluir",
                          destructive: true,
                        });
                        if (ok) remove.mutate(automation.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <DateAutomationForm open={formOpen} onOpenChange={setFormOpen} automation={editing} />
    </div>
  );
};
