import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { plannerService } from "@/services/api/plannerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";
import { PlannerCalendar, type PlannerView } from "./plannerCalendar";
import { PlannerCreateDialog } from "./plannerCreateDialog";
import { PlannerEventSheet } from "./plannerEventSheet";
import { PlannerPlanPanel } from "./plannerPlanPanel";
import { PlannerTaskDialog } from "./plannerTaskDialog";
import { eventTypeInfo, filterGroups, moveToDay } from "./plannerUtils";

const views: { value: PlannerView; label: string }[] = [
  { value: "month", label: "Mês" },
  { value: "week", label: "Semana" },
  { value: "list", label: "Lista" },
];

/** Planejamento: calendário único de postagens, campanhas, anúncios e tarefas, e o plano do mês com IA. */
export const PlannerPage = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "plan" ? "plan" : "calendar";

  const [storedView, setView] = useLocalStorage<PlannerView>(`planner:view:${client.id}`, "month");
  // No celular a grade não cabe: lista por dia
  const view: PlannerView = isMobile ? "list" : storedView;
  const [hiddenGroups, setHiddenGroups] = useLocalStorage<string[]>(`planner:hidden:${client.id}`, []);
  const [onlyMine, setOnlyMine] = useLocalStorage<boolean>(`planner:mine:${client.id}`, false);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [openEvent, setOpenEvent] = useState<PlannerEvent | null>(null);
  const [createDay, setCreateDay] = useState<Date | null>(null);
  // nonce remonta o diálogo a cada abertura, com o estado da tarefa ou do dia
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; nonce: number; task?: PlannerTask | null; day?: Date }>({
    open: false,
    nonce: 0,
  });

  const { days, from, to, title } = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(anchor);
      return {
        days: eachDayOfInterval({ start, end: endOfWeek(anchor) }),
        from: start,
        to: addDays(endOfWeek(anchor), 1),
        title: `${format(start, "dd/MM")} a ${format(endOfWeek(anchor), "dd/MM/yyyy")}`,
      };
    }
    const start = view === "month" ? startOfWeek(startOfMonth(anchor)) : startOfMonth(anchor);
    const end = view === "month" ? endOfWeek(endOfMonth(anchor)) : endOfMonth(anchor);
    return {
      days: eachDayOfInterval({ start, end }),
      from: start,
      to: startOfDay(addDays(end, 1)),
      title: format(anchor, "MMMM 'de' yyyy", { locale: ptBR }),
    };
  }, [anchor, view]);

  const calendarQuery = useQuery({
    queryKey: ["planner", client.id, "calendar", from.toISOString(), to.toISOString()],
    queryFn: () => plannerService.findCalendar(client.id, from.toISOString(), to.toISOString()),
  });

  const hiddenTypes = new Set(filterGroups.filter((group) => hiddenGroups.includes(group.id)).flatMap((group) => group.types));
  const { user } = useUserContext();
  const events = (calendarQuery.data ?? []).filter(
    (event) =>
      !hiddenTypes.has(event.type) &&
      (!onlyMine || !(event.type === "PLANNER_TASK" || event.type === "CRM_TASK") || event.assignee?.id === user?.id),
  );
  // Filtros só dos tipos que o usuário enxerga
  const presentTypes = new Set((calendarQuery.data ?? []).map((event) => event.type));

  const move = useMutation({
    mutationFn: ({ event, day }: { event: PlannerEvent; day: Date }) =>
      plannerService.move(client.id, { type: event.type, id: event.id, date: moveToDay(event, day).toISOString() }),
    onMutate: async ({ event, day }) => {
      // Muda na hora na tela; volta se o back recusar
      const key = ["planner", client.id, "calendar", from.toISOString(), to.toISOString()];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlannerEvent[]>(key);
      queryClient.setQueryData<PlannerEvent[]>(key, (current) =>
        current?.map((item) => (item.key === event.key ? { ...item, date: moveToDay(event, day).toISOString() } : item)),
      );
      return { previous, key };
    },
    onError: (error, _, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
      requestErrorHandling(error);
    },
    onSuccess: (_, { event, day }) => toast.success(`${eventTypeInfo[event.type].label} movida para ${format(day, "dd/MM")}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["planner", client.id] }),
  });

  const step = (direction: 1 | -1) =>
    setAnchor((current) => (view === "week" ? addWeeks(current, direction) : addMonths(current, direction)));
  const canCreate = can("planner.manage") || can("posts.manage") || can("broadcasts.send") || can("ads.manage");

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setSearchParams(value === "plan" ? { tab: "plan" } : {}, { replace: true })}
      className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Planejamento</h1>
          <p className="text-muted-foreground text-sm">
            Postagens, campanhas, anúncios e tarefas num só calendário. Arraste um item para outro dia para mudar a data.
          </p>
        </div>
        <TabsList>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
          <TabsTrigger value="plan">Plano do mês com IA</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="calendar" className="grid content-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="Anterior" onClick={() => step(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Próximo" onClick={() => step(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(startOfDay(new Date()))}>
              Hoje
            </Button>
          </div>
          <h2 className="min-w-40 text-lg font-medium capitalize">{title}</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!isMobile && (
              <div className="flex rounded-md border p-0.5" role="group" aria-label="Visualização">
                {views.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={view === option.value ? "secondary" : "ghost"}
                    aria-pressed={view === option.value}
                    className="h-7"
                    onClick={() => setView(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
            {canCreate && (
              <Button size="sm" onClick={() => setCreateDay(startOfDay(new Date()))}>
                <Plus className="h-4 w-4" aria-hidden />
                Criar
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filterGroups
            .filter((group) => group.types.some((type) => presentTypes.has(type)) || hiddenGroups.includes(group.id))
            .map((group) => {
              const active = !hiddenGroups.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setHiddenGroups((current) => (active ? [...current, group.id] : current.filter((item) => item !== group.id)))
                  }
                  className={cn(
                    "focus-visible:ring-ring flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs outline-none focus-visible:ring-2",
                    !active && "text-muted-foreground opacity-60",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", eventTypeInfo[group.types[0]].dotClassName)} aria-hidden />
                  {group.label}
                </button>
              );
            })}
          <button
            type="button"
            aria-pressed={onlyMine}
            onClick={() => setOnlyMine(!onlyMine)}
            className={cn(
              "focus-visible:ring-ring rounded-full border px-2.5 py-0.5 text-xs outline-none focus-visible:ring-2",
              onlyMine && "bg-secondary",
            )}
          >
            Só as minhas tarefas
          </button>
        </div>

        {calendarQuery.isLoading && <LoadingState label="Carregando o calendário..." />}
        {calendarQuery.isError && (
          <ErrorState
            message="Não foi possível carregar o calendário."
            onRetry={() => calendarQuery.refetch()}
            isRetrying={calendarQuery.isFetching}
          />
        )}
        {calendarQuery.isSuccess && (
          <PlannerCalendar
            view={view}
            days={days}
            month={anchor}
            events={events}
            onOpen={setOpenEvent}
            onMove={(event, day) => move.mutate({ event, day })}
            onCreate={canCreate ? setCreateDay : undefined}
          />
        )}
      </TabsContent>

      <TabsContent value="plan">
        <PlannerPlanPanel />
      </TabsContent>

      <PlannerEventSheet
        key={openEvent?.key ?? "none"}
        event={openEvent}
        onClose={() => setOpenEvent(null)}
        onEditTask={(task) => setTaskDialog((current) => ({ open: true, nonce: current.nonce + 1, task }))}
      />
      <PlannerCreateDialog
        key={createDay?.toISOString() ?? "none"}
        day={createDay}
        onClose={() => setCreateDay(null)}
        onCreateTask={(day) => {
          setCreateDay(null);
          setTaskDialog((current) => ({ open: true, nonce: current.nonce + 1, day }));
        }}
      />
      <PlannerTaskDialog
        key={taskDialog.nonce}
        open={taskDialog.open}
        onOpenChange={(open) => setTaskDialog((current) => ({ ...current, open }))}
        task={taskDialog.task}
        defaultDate={taskDialog.day}
      />
    </Tabs>
  );
};
