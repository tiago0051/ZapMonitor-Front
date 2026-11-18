import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { AlarmClock, CheckCheck, MoreHorizontal, Trash2 } from "lucide-react";
import { useRef, useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { crmSelectClassName } from "../crmUtils";
import { snoozeOptions, TASK_TYPES, taskTypeIcon, taskTypeLabel } from "../taskUtils";
import { useCrmOptions } from "../useCrmOptions";

// Valor de um <input type="datetime-local"> no fuso do navegador
const toDateTimeInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");
const defaultDueAt = () => toDateTimeInput(new Date(Date.now() + 24 * 60 * 60 * 1000));

/** Escolha do tipo da tarefa em botões com ícone; também usada no "Registrar atividade". */
export const TaskTypePicker: FC<{ value: DealTaskType; onChange: (type: DealTaskType) => void; label?: string }> = ({
  value,
  onChange,
  label = "Tipo da tarefa",
}) => (
  <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
    {TASK_TYPES.map((type) => {
      const Icon = taskTypeIcon[type];
      return (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          onClick={() => onChange(type)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
            value === type ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {taskTypeLabel[type]}
        </button>
      );
    })}
  </div>
);

/** Tarefas do negócio: criar com tipo, prazo e responsável; concluir (e criar a próxima), adiar e excluir. */
export const DealTasks: FC<{ deal: Deal }> = ({ deal }) => {
  const { client } = useClientContext();
  const { members } = useCrmOptions();
  const queryClient = useQueryClient();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<DealTaskType>("CALL");
  const [dueAt, setDueAt] = useState(defaultDueAt);
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
      setDueAt(defaultDueAt());
      toast.success("Tarefa criada");
    },
  });
  const setCompleted = useMutation({ mutationFn: crmService.setDealTaskCompleted, onError: requestErrorHandling, onSuccess });
  const updateTask = useMutation({ mutationFn: crmService.updateDealTask, onError: requestErrorHandling, onSuccess });
  const deleteTask = useMutation({ mutationFn: crmService.deleteDealTask, onError: requestErrorHandling, onSuccess });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dueAt) return;

    createTask.mutate({
      params: { clientId: client.id, dealId: deal.id },
      body: { title: title.trim(), type, dueAt: new Date(dueAt).toISOString(), ...(assigneeUserId && { assigneeUserId }) },
    });
  };

  // Prepara o formulário da próxima tarefa com o mesmo tipo e responsável, e leva o foco para o título
  const prepareNextTask = (task: DealTask) => {
    setType(task.type);
    setAssigneeUserId(task.assignee?.id ?? "");
    setTitle("");
    setDueAt(defaultDueAt());
    titleInputRef.current?.focus();
    titleInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const complete = (task: DealTask, createNext: boolean) =>
    setCompleted.mutate(
      { params: { clientId: client.id, taskId: task.id }, body: { completed: true } },
      {
        onSuccess: () => {
          if (createNext) return prepareNextTask(task);
          toast.success(`"${task.title}" concluída`, { action: { label: "Criar a próxima", onClick: () => prepareNextTask(task) } });
        },
      },
    );

  const snooze = (task: DealTask, until: Date, label: string) =>
    updateTask.mutate(
      {
        params: { clientId: client.id, taskId: task.id },
        body: { title: task.title, type: task.type, dueAt: until.toISOString(), assigneeUserId: task.assignee?.id ?? null },
      },
      { onSuccess: () => toast.success(`Adiada para ${label.toLowerCase()}`) },
    );

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
  const isBusy = setCompleted.isPending || updateTask.isPending;

  return (
    <section className="space-y-3">
      <h3 className="sr-only">Tarefas</h3>

      {tasks.length === 0 && !tasksQuery.isLoading && <p className="text-muted-foreground text-sm">Nenhuma tarefa neste negócio.</p>}

      <ul className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = !task.completedAt && isPast(new Date(task.dueAt));
          const TypeIcon = taskTypeIcon[task.type] ?? taskTypeIcon.OTHER;

          return (
            <li key={task.id} className="flex items-start gap-2 rounded-lg border p-2">
              <Checkbox
                aria-label={task.completedAt ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
                checked={!!task.completedAt}
                disabled={isBusy}
                onCheckedChange={(checked) =>
                  checked === true
                    ? complete(task, false)
                    : setCompleted.mutate({ params: { clientId: client.id, taskId: task.id }, body: { completed: false } })
                }
                className="mt-0.5"
              />
              <TypeIcon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-label={taskTypeLabel[task.type]} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm break-words", task.completedAt && "text-muted-foreground line-through")}>{task.title}</p>
                <p className={cn("text-xs", isOverdue ? "font-medium text-red-600" : "text-muted-foreground")}>
                  {isOverdue && "Atrasada · "}
                  {format(new Date(task.dueAt), "dd/MM 'às' HH:mm", { locale: ptBR })} · {task.assignee?.name ?? "Sem responsável"}
                </p>
              </div>
              {!task.completedAt && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground h-7 w-7"
                      aria-label={`Mais ações de ${task.title}`}
                      disabled={isBusy}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => complete(task, true)}>
                      <CheckCheck className="h-4 w-4" />
                      Concluir e criar a próxima
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-muted-foreground flex items-center gap-1.5 text-xs font-normal">
                      <AlarmClock className="h-3.5 w-3.5" />
                      Adiar para
                    </DropdownMenuLabel>
                    {snoozeOptions.map((option) => (
                      <DropdownMenuItem key={option.id} onSelect={() => snooze(task, option.dueAt(), option.label)}>
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
        <TaskTypePicker value={type} onChange={setType} />
        <Input
          id="new-task-title"
          ref={titleInputRef}
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
