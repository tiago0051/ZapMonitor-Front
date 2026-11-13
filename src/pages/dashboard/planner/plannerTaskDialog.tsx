import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { plannerService } from "@/services/api/plannerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { plannerSelectClassName, plannerTextareaClassName, taskCategoryLabel } from "./plannerUtils";
import { usePlannerMembers } from "./usePlannerMembers";

type PlannerTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Editar; sem tarefa, cria
  task?: PlannerTask | null;
  defaultDate?: Date;
};

/** Criar ou editar tarefa do planejamento: dia (com hora opcional), categoria e responsável. */
export const PlannerTaskDialog: FC<PlannerTaskDialogProps> = ({ open, onOpenChange, task, defaultDate }) => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const queryClient = useQueryClient();
  const members = usePlannerMembers();

  // A tela monta o diálogo de novo a cada abertura (key), então o estado nasce da tarefa ou do dia clicado
  const initialDate = task ? new Date(task.dueAt) : (defaultDate ?? new Date());
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [day, setDay] = useState(format(initialDate, "yyyy-MM-dd"));
  const [withTime, setWithTime] = useState(task ? !task.allDay : false);
  const [time, setTime] = useState(task && !task.allDay ? format(initialDate, "HH:mm") : "09:00");
  const [category, setCategory] = useState<PlannerTaskCategory>(task?.category ?? "CONTENT");
  const [assigneeUserId, setAssigneeUserId] = useState(task ? (task.assigneeUserId ?? "") : (user?.id ?? ""));

  const save = useMutation({
    mutationFn: () => {
      const dueAt = new Date(`${day}T${withTime ? time : "12:00"}`).toISOString();
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        dueAt,
        allDay: !withTime,
        category,
        assigneeUserId: assigneeUserId || null,
      };
      return task ? plannerService.updateTask(client.id, task.id, body) : plannerService.createTask(client.id, body);
    },
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", client.id] });
      toast.success(task ? "Tarefa salva" : "Tarefa criada");
      onOpenChange(false);
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() && day) save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Ex.: criar os criativos da semana, gravar o reel, revisar a lista do disparo.</DialogDescription>
        </DialogHeader>
        <form id="planner-task-form" onSubmit={onSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="planner-task-title">Título</Label>
            <Input
              id="planner-task-title"
              value={title}
              maxLength={300}
              autoFocus
              placeholder="Criar criativos da semana"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="planner-task-description">Detalhes</Label>
            <textarea
              id="planner-task-description"
              value={description}
              maxLength={5000}
              onChange={(event) => setDescription(event.target.value)}
              className={plannerTextareaClassName}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="planner-task-day">Dia</Label>
              <Input id="planner-task-day" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center gap-2">
                <Checkbox id="planner-task-with-time" checked={withTime} onCheckedChange={(checked) => setWithTime(checked === true)} />
                <Label htmlFor="planner-task-with-time">Com horário</Label>
              </div>
              <Input type="time" aria-label="Horário" value={time} disabled={!withTime} onChange={(event) => setTime(event.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="planner-task-category">Categoria</Label>
              <select
                id="planner-task-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as PlannerTaskCategory)}
                className={plannerSelectClassName}
              >
                {(Object.keys(taskCategoryLabel) as PlannerTaskCategory[]).map((value) => (
                  <option key={value} value={value}>
                    {taskCategoryLabel[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="planner-task-assignee">Responsável</Label>
              <select
                id="planner-task-assignee"
                value={assigneeUserId}
                onChange={(event) => setAssigneeUserId(event.target.value)}
                className={plannerSelectClassName}
              >
                <option value="">Ninguém</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name ?? member.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="planner-task-form" disabled={!title.trim() || !day || save.isPending}>
            {task ? "Salvar" : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
