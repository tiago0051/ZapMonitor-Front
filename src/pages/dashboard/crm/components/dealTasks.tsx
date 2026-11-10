import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { undoableAction } from "@/lib/undoToast";
import { cn } from "@/lib/utils";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { crmSelectClassName } from "../crmUtils";
import { useCrmOptions } from "../useCrmOptions";

// Valor de um <input type="datetime-local"> no fuso do navegador
const toDateTimeInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

/** Tarefas do negócio: criar com prazo e responsável, concluir e excluir. */
export const DealTasks: FC<{ deal: Deal }> = ({ deal }) => {
  const { client } = useClientContext();
  const { members } = useCrmOptions();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState(() => toDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [assigneeUserId, setAssigneeUserId] = useState("");
  // Tarefas excluídas aguardando o prazo do "Desfazer"
  const [hiddenTaskIds, setHiddenTaskIds] = useState<string[]>([]);

  const tasksQuery = useQuery({
    queryKey: ["crm", "deals", "tasks", deal.id],
    queryFn: () => crmService.findDealTasks({ params: { clientId: client.id, dealId: deal.id } }),
  });

  // Tarefas mexem no card (próximo prazo) e na lista de "Minhas tarefas"
  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
    queryClient.invalidateQueries({ queryKey: ["crm", "myTasks"] });
  };

  const createTask = useMutation({
    mutationFn: crmService.createDealTask,
    onError: requestErrorHandling,
    onSuccess: () => {
      onSuccess();
      setTitle("");
      toast.success("Tarefa criada");
    },
  });
  const setCompleted = useMutation({ mutationFn: crmService.setDealTaskCompleted, onError: requestErrorHandling, onSuccess });
  const deleteTask = useMutation({ mutationFn: crmService.deleteDealTask, onError: requestErrorHandling, onSuccess });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dueAt) return;

    createTask.mutate({
      params: { clientId: client.id, dealId: deal.id },
      body: { title: title.trim(), dueAt: new Date(dueAt).toISOString(), ...(assigneeUserId && { assigneeUserId }) },
    });
  };

  const handleDelete = (task: DealTask) => {
    setHiddenTaskIds((ids) => [...ids, task.id]);
    undoableAction({
      message: "Tarefa excluída",
      commit: () =>
        deleteTask.mutateAsync({ params: { clientId: client.id, taskId: task.id } }).catch(() => {
          setHiddenTaskIds((ids) => ids.filter((id) => id !== task.id));
        }),
      onUndo: () => setHiddenTaskIds((ids) => ids.filter((id) => id !== task.id)),
    });
  };

  const tasks = (tasksQuery.data ?? []).filter((task) => !hiddenTaskIds.includes(task.id));

  return (
    <section className="space-y-3">
      <h3 className="sr-only">Tarefas</h3>

      {tasks.length === 0 && !tasksQuery.isLoading && <p className="text-muted-foreground text-sm">Nenhuma tarefa neste negócio.</p>}

      <ul className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = !task.completedAt && isPast(new Date(task.dueAt));

          return (
            <li key={task.id} className="flex items-start gap-2 rounded-lg border p-2">
              <Checkbox
                aria-label={task.completedAt ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
                checked={!!task.completedAt}
                disabled={setCompleted.isPending}
                onCheckedChange={(checked) =>
                  setCompleted.mutate({ params: { clientId: client.id, taskId: task.id }, body: { completed: checked === true } })
                }
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", task.completedAt && "text-muted-foreground line-through")}>{task.title}</p>
                <p className={cn("text-xs", isOverdue ? "font-medium text-red-600" : "text-muted-foreground")}>
                  {isOverdue && "Atrasada · "}
                  {format(new Date(task.dueAt), "dd/MM 'às' HH:mm", { locale: ptBR })} · {task.assignee?.name ?? "Sem responsável"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-7 w-7"
                aria-label={`Excluir ${task.title}`}
                onClick={() => handleDelete(task)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleCreate} className="grid gap-2 rounded-lg border border-dashed p-3">
        <Label htmlFor="new-task-title" className="text-xs">
          Nova tarefa
        </Label>
        <Input
          id="new-task-title"
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Ligar para enviar a proposta"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input type="datetime-local" aria-label="Prazo da tarefa" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          <select
            aria-label="Responsável pela tarefa"
            value={assigneeUserId}
            onChange={(event) => setAssigneeUserId(event.target.value)}
            className={crmSelectClassName}
          >
            <option value="">Eu mesmo</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name ?? member.email}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" className="justify-self-start" disabled={!title.trim() || !dueAt || createTask.isPending}>
          Criar tarefa
        </Button>
      </form>
    </section>
  );
};
