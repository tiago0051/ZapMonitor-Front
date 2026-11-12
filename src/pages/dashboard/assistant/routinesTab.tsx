import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { assistantService } from "@/services/api/assistantService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, MessageSquare } from "lucide-react";
import type { FC } from "react";
import { assistantKeys, weekdayLabel } from "./assistantUtils";

const frequencyText = (routine: AssistantRoutine) => {
  const hour = `${String(routine.hour).padStart(2, "0")}h`;
  if (routine.frequency === "WEEKLY" && routine.weekday !== null) return `Toda ${weekdayLabel[routine.weekday]} às ${hour}`;
  return `Todo dia às ${hour}`;
};

type RoutinesTabProps = { onOpenConversation: (conversationId: string) => void };

/** Tarefas que o assistente roda sozinho; mudanças que elas propõem viram plano para aprovar. */
export const RoutinesTab: FC<RoutinesTabProps> = ({ onOpenConversation }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const routinesQuery = useQuery({
    queryKey: assistantKeys.routines(client.id),
    queryFn: () => assistantService.findRoutines(client.id),
  });
  const setEnabled = useMutation({
    mutationFn: (variables: { id: string; enabled: boolean }) =>
      assistantService.setRoutineEnabled(client.id, variables.id, variables.enabled),
    onSuccess: (updated) =>
      queryClient.setQueryData<AssistantRoutine[]>(assistantKeys.routines(client.id), (current) =>
        current?.map((routine) => (routine.id === updated.id ? { ...routine, ...updated } : routine)),
      ),
    onError: requestErrorHandling,
    onSettled: () => queryClient.invalidateQueries({ queryKey: assistantKeys.routines(client.id) }),
  });

  if (routinesQuery.isLoading) return <LoadingState label="Carregando rotinas..." />;
  if (routinesQuery.isError)
    return (
      <ErrorState
        message="Não foi possível buscar as rotinas."
        onRetry={() => routinesQuery.refetch()}
        isRetrying={routinesQuery.isFetching}
      />
    );

  const routines = routinesQuery.data ?? [];
  if (routines.length === 0)
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nenhuma rotina ainda"
        description='Rotinas nascem pedindo ao assistente, por exemplo: "toda segunda às 9h revise os anúncios e proponha ajustes". O que ele propuser vira plano para aprovar.'
      />
    );

  return (
    <ul className="grid gap-3">
      {routines.map((routine) => {
        const switchId = `assistant-routine-${routine.id}`;
        const pending = setEnabled.isPending && setEnabled.variables?.id === routine.id;
        return (
          <li key={routine.id} className={cn("grid gap-2 rounded-xl border p-4", !routine.enabled && "bg-muted/30")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold break-words">{routine.title}</h3>
                <p className="text-muted-foreground text-sm">{frequencyText(routine)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label htmlFor={switchId} className="text-muted-foreground text-xs">
                  {routine.enabled ? "Ligada" : "Desligada"}
                </label>
                <Switch
                  id={switchId}
                  checked={routine.enabled}
                  disabled={pending}
                  onCheckedChange={(enabled) => setEnabled.mutate({ id: routine.id, enabled })}
                />
              </div>
            </div>
            <p className="text-sm break-words whitespace-pre-wrap">{routine.instruction}</p>
            <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {routine.enabled && (
                <div>
                  <dt className="inline">Próxima: </dt>
                  <dd className="inline">{format(new Date(routine.nextRunAt), "dd/MM HH:mm")}</dd>
                </div>
              )}
              <div>
                <dt className="inline">Última: </dt>
                <dd className="inline">{routine.lastRunAt ? format(new Date(routine.lastRunAt), "dd/MM HH:mm") : "ainda não rodou"}</dd>
              </div>
            </dl>
            {routine.lastError && (
              <p className="text-destructive bg-destructive/10 rounded-md px-2 py-1.5 text-xs">Falhou na última vez: {routine.lastError}</p>
            )}
            {routine.conversationId && (
              <div>
                <Button size="sm" variant="outline" onClick={() => onOpenConversation(routine.conversationId!)}>
                  <MessageSquare className="h-4 w-4" />
                  Abrir conversa
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
