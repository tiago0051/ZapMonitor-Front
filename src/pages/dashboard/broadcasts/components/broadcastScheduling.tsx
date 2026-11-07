import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { broadcastService } from "@/services/api/broadcastService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { describeSendWindow, isFutureSchedule, sendWindowError, toLocalInputValue } from "../broadcastUtils";
import { SendWindowFields } from "./sendWindowFields";

type SchedulableCampaign = Pick<Broadcast, "id" | "scheduledAt" | "startedAt" | "sendWindow"> & { status: BroadcastStatus };

/** Chamadas de agendamento; o padrão é o da campanha de WhatsApp, a de e-mail passa as suas. */
export type SchedulingApi = {
  queryKey: string;
  schedule: (clientId: string, id: string, scheduledAt: string) => Promise<unknown>;
  unschedule: (clientId: string, id: string) => Promise<unknown>;
  action: (clientId: string, id: string, action: "start" | "pause") => Promise<{ status: string }>;
  setSendWindow: (clientId: string, id: string, sendWindow: BroadcastSendWindow | null) => Promise<unknown>;
};

const broadcastSchedulingApi: SchedulingApi = {
  queryKey: "broadcasts",
  schedule: broadcastService.schedule,
  unschedule: broadcastService.unschedule,
  action: broadcastService.action,
  setSendWindow: broadcastService.setSendWindow,
};

type BroadcastSchedulingProps = {
  broadcast: SchedulableCampaign;
  canSend: boolean;
  api?: SchedulingApi;
};

/** Agendamento e janela de envio da campanha: quando começa, quando espera e como trocar. */
export const BroadcastScheduling: FC<BroadcastSchedulingProps> = ({ broadcast, canSend, api = broadcastSchedulingApi }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [scheduledAt, setScheduledAt] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [editingWindow, setEditingWindow] = useState(false);
  const [draftWindow, setDraftWindow] = useState<BroadcastSendWindow | null>(broadcast.sendWindow);

  const refresh = () => queryClient.invalidateQueries({ queryKey: [api.queryKey, client.id] });

  const scheduleMutation = useMutation({
    mutationFn: () => api.schedule(client.id, broadcast.id, new Date(scheduledAt).toISOString()),
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      toast.success("Campanha agendada");
    },
  });

  const unscheduleMutation = useMutation({
    mutationFn: () => api.unschedule(client.id, broadcast.id),
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      toast.success("Agendamento desfeito; a campanha voltou para rascunho");
    },
  });

  const actionMutation = useMutation({
    mutationFn: (action: "start" | "pause") => api.action(client.id, broadcast.id, action),
    onError: requestErrorHandling,
    onSuccess: (updated, action) => {
      refresh();
      if (action === "pause") toast.success("Campanha pausada");
      else if (updated.status === "SCHEDULED") toast.info("Fora da janela de envio; começa no próximo horário permitido");
      else toast.success("Envio iniciado");
    },
  });

  const windowMutation = useMutation({
    mutationFn: () => api.setSendWindow(client.id, broadcast.id, draftWindow),
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      setEditingWindow(false);
      toast.success(draftWindow ? "Janela de envio salva" : "Janela de envio removida");
    },
  });

  const busy = scheduleMutation.isPending || unscheduleMutation.isPending || actionMutation.isPending || windowMutation.isPending;
  const finished = broadcast.status === "COMPLETED" || broadcast.status === "CANCELED";
  const scheduled = broadcast.status === "SCHEDULED";
  const waitingWindow = scheduled && !!broadcast.startedAt;
  const scheduleInvalid = !isFutureSchedule(scheduledAt);

  if (finished && !broadcast.sendWindow) return null;

  return (
    <div className="grid gap-3 rounded-xl border p-4">
      {scheduled && broadcast.scheduledAt && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm">
            <CalendarClock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {waitingWindow ? "Esperando a janela de envio. Continua" : "Agendada para começar"} em{" "}
              <strong>{format(new Date(broadcast.scheduledAt), "dd/MM/yyyy 'às' HH:mm")}</strong>.
            </span>
          </p>
          {canSend && (
            <div className="flex flex-wrap gap-2">
              {!waitingWindow && (
                <Button size="sm" disabled={busy} onClick={() => actionMutation.mutate("start")}>
                  Iniciar agora
                </Button>
              )}
              {!waitingWindow && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => unscheduleMutation.mutate()}>
                  Desagendar
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={busy} onClick={() => actionMutation.mutate("pause")}>
                Pausar
              </Button>
            </div>
          )}
        </div>
      )}

      {broadcast.status === "DRAFT" && canSend && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="broadcast-detail-scheduled-at" className="text-xs">
              Agendar o início
            </Label>
            <Input
              id="broadcast-detail-scheduled-at"
              type="datetime-local"
              className="h-9 w-full min-w-0 sm:w-60"
              value={scheduledAt}
              min={toLocalInputValue(new Date())}
              disabled={busy}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
          <Button variant="outline" disabled={busy || scheduleInvalid} onClick={() => scheduleMutation.mutate()}>
            Agendar
          </Button>
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Janela de envio: </span>
            {broadcast.sendWindow ? describeSendWindow(broadcast.sendWindow) : "qualquer horário"}
          </p>
          {canSend && !finished && !editingWindow && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setDraftWindow(broadcast.sendWindow);
                setEditingWindow(true);
              }}
            >
              Alterar
            </Button>
          )}
        </div>
        {editingWindow && (
          <div className="grid gap-3">
            <SendWindowFields value={draftWindow} onChange={setDraftWindow} idPrefix="broadcast-detail-window" disabled={busy} />
            <div className="flex gap-2">
              <Button size="sm" disabled={busy || !!sendWindowError(draftWindow)} onClick={() => windowMutation.mutate()}>
                Salvar janela
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditingWindow(false)}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
