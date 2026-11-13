import { cn } from "@/lib/utils";
import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import { useState, type DragEvent, type FC } from "react";
import { eventTime, eventTypeInfo } from "./plannerUtils";

export type PlannerView = "month" | "week" | "list";

type PlannerCalendarProps = {
  view: PlannerView;
  days: Date[];
  // Mês exibido (os dias de fora ficam apagados na grade)
  month: Date;
  events: PlannerEvent[];
  onOpen: (event: PlannerEvent) => void;
  onMove: (event: PlannerEvent, day: Date) => void;
  // Sem função, o dia não oferece criar
  onCreate?: (day: Date) => void;
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_VISIBLE = 3;

const EventChip: FC<{ event: PlannerEvent; onOpen: () => void; compact?: boolean }> = ({ event, onOpen, compact }) => {
  const info = eventTypeInfo[event.type];
  const Icon = info.icon;
  const time = eventTime(event);
  const done = event.completed && (event.type === "PLANNER_TASK" || event.type === "CRM_TASK");

  return (
    <button
      type="button"
      draggable={event.movable}
      onDragStart={(drag: DragEvent) => {
        drag.dataTransfer.setData("text/plain", event.key);
        drag.dataTransfer.effectAllowed = "move";
      }}
      onClick={(click) => {
        click.stopPropagation();
        onOpen();
      }}
      title={`${info.label}: ${event.title}`}
      className={cn(
        "focus-visible:ring-ring flex w-full min-w-0 items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs outline-none focus-visible:ring-2",
        info.className,
        event.movable && "cursor-grab active:cursor-grabbing",
        done && "opacity-60",
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {time && !compact && <span className="shrink-0 tabular-nums">{time}</span>}
      <span className={cn("truncate", done && "line-through")}>{event.title}</span>
    </button>
  );
};

/** Grade do mês ou da semana, e lista por dia; arrastar um item para outro dia muda a data dele. */
export const PlannerCalendar: FC<PlannerCalendarProps> = ({ view, days, month, events, onOpen, onMove, onCreate }) => {
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const eventsOf = (day: Date) => events.filter((event) => isSameDay(new Date(event.date), day));

  const dropHandlers = (day: Date) => ({
    onDragOver: (drag: DragEvent) => {
      drag.preventDefault();
      setDropDay(day.toISOString());
    },
    onDragLeave: () => setDropDay(null),
    onDrop: (drag: DragEvent) => {
      drag.preventDefault();
      setDropDay(null);
      const event = events.find((item) => item.key === drag.dataTransfer.getData("text/plain"));
      if (event && !isSameDay(new Date(event.date), day)) onMove(event, day);
    },
  });

  if (view === "list") {
    const withEvents = days.filter((day) => eventsOf(day).length > 0);
    if (!withEvents.length)
      return <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">Nada marcado neste período.</p>;

    return (
      <div className="grid gap-3">
        {withEvents.map((day) => (
          <section key={day.toISOString()} className="grid gap-1.5">
            <h3 className={cn("text-sm font-medium capitalize", isToday(day) && "text-primary")}>
              {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              {isToday(day) && " · hoje"}
            </h3>
            <div className="grid gap-1">
              {eventsOf(day).map((event) => (
                <EventChip key={event.key} event={event} onOpen={() => onOpen(event)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-lg border">
        {weekDays.map((name) => (
          <div key={name} className="bg-muted/50 border-b px-2 py-1 text-center text-xs font-medium">
            {name}
          </div>
        ))}
        {days.map((day) => {
          const key = day.toISOString();
          const dayEvents = eventsOf(day);
          const expanded = view === "week" || expandedDay === key;
          const visible = expanded ? dayEvents : dayEvents.slice(0, MONTH_VISIBLE);
          const hidden = dayEvents.length - visible.length;

          return (
            <div
              key={key}
              {...dropHandlers(day)}
              className={cn(
                "group relative flex flex-col gap-1 border-r border-b p-1 last:border-r-0 [&:nth-child(7n)]:border-r-0",
                view === "week" ? "min-h-64" : "min-h-28",
                view === "month" && !isSameMonth(day, month) && "bg-muted/30 text-muted-foreground",
                dropDay === key && "bg-primary/10 ring-primary ring-2 ring-inset",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums",
                    isToday(day) && "bg-primary text-primary-foreground font-semibold",
                  )}
                >
                  {format(day, view === "week" ? "dd/MM" : "d")}
                </span>
                {onCreate && (
                  <button
                    type="button"
                    aria-label={`Criar no dia ${format(day, "dd/MM")}`}
                    onClick={() => onCreate(day)}
                    className="text-muted-foreground hover:bg-accent focus-visible:ring-ring rounded p-0.5 opacity-0 outline-none group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {visible.map((event) => (
                <EventChip key={event.key} event={event} onOpen={() => onOpen(event)} compact={view === "month"} />
              ))}
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => setExpandedDay(key)}
                  className="text-muted-foreground hover:text-foreground text-left text-xs"
                >
                  + {hidden} {hidden === 1 ? "item" : "itens"}
                </button>
              )}
              {view === "month" && expandedDay === key && dayEvents.length > MONTH_VISIBLE && (
                <button type="button" onClick={() => setExpandedDay(null)} className="text-muted-foreground text-left text-xs">
                  mostrar menos
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
