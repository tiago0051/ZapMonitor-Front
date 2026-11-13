import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { crmService } from "@/services/api/crmService";
import { plannerService } from "@/services/api/plannerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { useState, type FC } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { eventLink, eventStatusLabel, eventTypeInfo, itemKindLabel, moveToDay, postFormatLabel } from "./plannerUtils";

type PlannerEventSheetProps = {
  event: PlannerEvent | null;
  onClose: () => void;
  onEditTask: (task: PlannerTask) => void;
};

/** Detalhe do item clicado no calendário, com as ações que cabem a ele. */
export const PlannerEventSheet: FC<PlannerEventSheetProps> = ({ event, onClose, onEditTask }) => {
  const { client, can, access } = useClientContext();
  const { user } = useUserContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  // A tela monta o painel de novo para cada item (key)
  const [day, setDay] = useState(event ? format(new Date(event.date), "yyyy-MM-dd") : "");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["planner", client.id] });
  const done = (message: string) => {
    refresh();
    toast.success(message);
    onClose();
  };

  const move = useMutation({
    mutationFn: (date: Date) => plannerService.move(client.id, { type: event!.type, id: event!.id, date: date.toISOString() }),
    onError: requestErrorHandling,
    onSuccess: () => done("Data alterada"),
  });
  const complete = useMutation({
    mutationFn: (completed: boolean): Promise<unknown> =>
      event!.type === "CRM_TASK"
        ? crmService.setDealTaskCompleted({ params: { clientId: client.id, taskId: event!.id }, body: { completed } })
        : plannerService.setTaskCompleted(client.id, event!.id, completed),
    onError: requestErrorHandling,
    onSuccess: (_, completed) => {
      if (event?.type === "CRM_TASK") queryClient.invalidateQueries({ queryKey: ["crm"] });
      done(completed ? "Tarefa concluída" : "Tarefa reaberta");
    },
  });
  const removeTask = useMutation({
    mutationFn: () => plannerService.deleteTask(client.id, event!.id),
    onError: requestErrorHandling,
    onSuccess: () => done("Tarefa excluída"),
  });
  const editTask = useMutation({
    mutationFn: () => plannerService.findTask(client.id, event!.id),
    onError: requestErrorHandling,
    onSuccess: (task) => {
      onClose();
      onEditTask(task);
    },
  });
  const accept = useMutation({
    mutationFn: () => plannerService.acceptItem(client.id, event!.id),
    onError: requestErrorHandling,
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["planner", client.id] });
      queryClient.invalidateQueries({ queryKey: ["socialPosts", client.id] });
      toast.success(item.socialPostId ? "A IA está escrevendo a postagem no dia previsto" : "Sugestão virou tarefa");
      onClose();
    },
  });
  const discard = useMutation({
    mutationFn: () => plannerService.discardItem(client.id, event!.id),
    onError: requestErrorHandling,
    onSuccess: () => done("Sugestão descartada"),
  });

  if (!event) return null;
  const info = eventTypeInfo[event.type];
  const Icon = info.icon;
  const link = eventLink(baseUrl, event);
  const isTask = event.type === "PLANNER_TASK" || event.type === "CRM_TASK";
  const canComplete =
    event.type === "CRM_TASK" || (event.type === "PLANNER_TASK" && (can("planner.manage") || event.assignee?.id === user?.id));
  const kind = event.ref.kind as PlannerItemKind | undefined;
  const createsPost = event.type === "PLAN_ITEM" && kind === "SOCIAL_POST" && can("posts.manage") && access.adsEnabled;
  const busy = move.isPending || complete.isPending || removeTask.isPending || accept.isPending || discard.isPending;

  return (
    <Sheet open={!!event} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <span className={cn("inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", info.className)}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {event.type === "PLAN_ITEM" && kind ? `Sugestão: ${itemKindLabel[kind]}` : info.label}
          </span>
          <SheetTitle className={cn(event.completed && isTask && "line-through")}>{event.title}</SheetTitle>
          <SheetDescription>
            {format(new Date(event.date), event.allDay ? "EEEE, dd 'de' MMMM" : "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            {event.endDate && event.type === "AD_CAMPAIGN" && ` · termina em ${format(new Date(event.endDate), "dd/MM")}`}
            {" · "}
            {eventStatusLabel(event)}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 px-4 pb-6">
          {event.detail && <p className="text-sm whitespace-pre-line">{event.detail}</p>}
          {event.type === "PLAN_ITEM" && event.ref.format && (
            <p className="text-muted-foreground text-xs">Formato sugerido: {postFormatLabel[event.ref.format as SocialPostFormat]}</p>
          )}
          {event.assignee && <p className="text-muted-foreground text-sm">Responsável: {event.assignee.name}</p>}

          {canComplete && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="planner-event-done"
                checked={event.completed}
                disabled={busy}
                onCheckedChange={(checked) => complete.mutate(checked === true)}
              />
              <Label htmlFor="planner-event-done">Concluída</Label>
            </div>
          )}

          {event.type === "PLAN_ITEM" && can("planner.manage") && (
            <div className="grid gap-2 rounded-lg border p-3">
              <p className="text-sm">
                {createsPost
                  ? "Aceitar cria a postagem em rascunho: a IA escreve a legenda e as imagens (ou o roteiro do reel) no dia previsto, para você revisar."
                  : "Aceitar cria uma tarefa no dia com este briefing, para montar no módulo."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => accept.mutate()}>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  {createsPost ? "Criar postagem" : "Virar tarefa"}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => discard.mutate()}>
                  <X className="h-4 w-4" aria-hidden />
                  Descartar
                </Button>
              </div>
            </div>
          )}

          {event.movable && (
            <div className="grid gap-1.5">
              <Label htmlFor="planner-event-day">Mudar para o dia</Label>
              <div className="flex gap-2">
                <Input id="planner-event-day" type="date" value={day} onChange={(change) => setDay(change.target.value)} />
                <Button
                  variant="outline"
                  disabled={busy || !day || day === format(new Date(event.date), "yyyy-MM-dd")}
                  onClick={() => move.mutate(moveToDay(event, new Date(`${day}T00:00`)))}
                >
                  Mudar
                </Button>
              </div>
              {event.type === "SOCIAL_POST" && event.status === "SCHEDULED" && (
                <p className="text-muted-foreground text-xs">A postagem agendada muda de dia mantendo o horário.</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {link && (
              <Button asChild variant="outline" size="sm">
                <Link to={link}>
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Abrir
                </Link>
              </Button>
            )}
            {event.type === "PLANNER_TASK" && can("planner.manage") && (
              <>
                <Button variant="outline" size="sm" disabled={busy || editTask.isPending} onClick={() => editTask.mutate()}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={busy}
                  onClick={async () => {
                    if (await confirm({ title: "Excluir a tarefa?", destructive: true, confirmLabel: "Excluir" })) removeTask.mutate();
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Excluir
                </Button>
              </>
            )}
          </div>
        </div>
        {confirmDialog}
      </SheetContent>
    </Sheet>
  );
};
