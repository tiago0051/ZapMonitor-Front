import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfDay, format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListTodo } from "lucide-react";
import { useState } from "react";
import { DealSheet } from "./components/dealSheet";
import { useCrmOptions } from "./useCrmOptions";

type TaskGroup = { id: string; label: string; tasks: DealTask[] };

/** Tarefas abertas atribuídas ao usuário, separadas em atrasadas, de hoje e próximas. */
export const MyTasks = () => {
  const { client } = useClientContext();
  const { pipelines } = useCrmOptions();
  const queryClient = useQueryClient();
  const [openDealId, setOpenDealId] = useState<string | null>(null);

  const tasksQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["crm", "myTasks", client.id],
    queryFn: () => crmService.findMyTasks({ params: { clientId: client.id } }),
  });

  const completeTask = useMutation({
    mutationFn: crmService.setDealTaskCompleted,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "myTasks"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
    },
  });

  if (tasksQuery.isLoading) return <LoadingState />;
  if (tasksQuery.isError)
    return (
      <ErrorState
        message="Não foi possível carregar suas tarefas."
        onRetry={() => tasksQuery.refetch()}
        isRetrying={tasksQuery.isFetching}
      />
    );

  const tasks = tasksQuery.data ?? [];
  if (tasks.length === 0)
    return (
      <EmptyState icon={ListTodo} title="Nenhuma tarefa aberta" description="As tarefas atribuídas a você nos negócios aparecem aqui." />
    );

  const todayEnd = endOfDay(new Date());
  const groups: TaskGroup[] = [
    { id: "overdue", label: "Atrasadas", tasks: tasks.filter((task) => isPast(new Date(task.dueAt))) },
    { id: "today", label: "Hoje", tasks: tasks.filter((task) => !isPast(new Date(task.dueAt)) && new Date(task.dueAt) <= todayEnd) },
    { id: "upcoming", label: "Próximas", tasks: tasks.filter((task) => new Date(task.dueAt) > todayEnd) },
  ];

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      {groups
        .filter((group) => group.tasks.length > 0)
        .map((group) => (
          <section key={group.id} className="space-y-2">
            <h2 className={cn("text-sm font-semibold", group.id === "overdue" && "text-red-600")}>
              {group.label} <span className="text-muted-foreground font-normal">({group.tasks.length})</span>
            </h2>
            <ul className="divide-y rounded-lg border">
              {group.tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-3 py-2">
                  <Checkbox
                    aria-label={`Concluir ${task.title}`}
                    disabled={completeTask.isPending}
                    onCheckedChange={() =>
                      completeTask.mutate({ params: { clientId: client.id, taskId: task.id }, body: { completed: true } })
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{task.title}</p>
                    <button
                      type="button"
                      onClick={() => setOpenDealId(task.deal.id)}
                      className="text-muted-foreground text-xs hover:underline"
                    >
                      {task.deal.title} · {pipelines.find((pipeline) => pipeline.id === task.deal.pipelineId)?.name}
                    </button>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      group.id === "overdue" ? "font-medium text-red-600" : "text-muted-foreground",
                    )}
                  >
                    {format(new Date(task.dueAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

      <DealSheet dealId={openDealId} onClose={() => setOpenDealId(null)} />
    </div>
  );
};
