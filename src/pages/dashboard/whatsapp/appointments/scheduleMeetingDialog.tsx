import { useConfirm } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { selectClassName, textareaClassName } from "@/pages/dashboard/offers/offerUtils";
import { googleCalendarService } from "@/services/api/googleCalendarService";
import { requestErrorMessage } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { AlertTriangle, Bot, CalendarCheck, Trash2 } from "lucide-react";
import { type FC, type FormEvent, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { appointmentsQueryKey } from "./appointmentKeys";

const DURATIONS = [15, 30, 45, 60, 90, 120];
const pad = (value: number) => String(value).padStart(2, "0");

/** Próxima hora cheia (amanhã cedo, se já passou das 18h), no relógio de quem agenda. */
function suggestedSlot() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  if (date.getHours() >= 18 || date.getHours() < 8) {
    if (date.getHours() >= 18) date.setDate(date.getDate() + 1);
    date.setHours(9);
  }
  return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:00` };
}

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  options: ContactAppointmentOptions;
}

/**
 * Agendamento manual durante o atendimento: marca no Google Agenda conectado. Vale como os agendamentos da IA (lembrete
 * por WhatsApp e reunião no relatório) e lista os próximos do contato para desmarcar.
 */
export const ScheduleMeetingDialog: FC<ScheduleMeetingDialogProps> = ({ open, onOpenChange, ...props }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      {/* O conteúdo monta a cada abertura: o formulário começa de novo com o horário sugerido */}
      <ScheduleMeetingBody {...props} onDone={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
);

const ScheduleMeetingBody: FC<Omit<ScheduleMeetingDialogProps, "open" | "onOpenChange"> & { onDone: () => void }> = ({
  contactId,
  contactName,
  options,
  onDone,
}) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const baseUrl = `/dashboard/client/${client.id}`;

  const [form, setForm] = useState(() => ({
    calendarId: options.defaults?.calendarId ?? options.calendars[0]?.id ?? "",
    ...suggestedSlot(),
    durationMinutes: options.defaults?.durationMinutes ?? 60,
    title: options.defaults?.title ?? "Reunião - {{nome}}",
    notes: "",
  }));
  const [conflict, setConflict] = useState<string | null>(null);

  const connected = options.status === "CONNECTED";
  const appointments = useQuery({
    meta: { errorHandledInline: true },
    queryKey: appointmentsQueryKey(client.id, contactId),
    queryFn: () => googleCalendarService.findContactAppointments(client.id, contactId),
    enabled: connected,
  });

  const create = useMutation({
    mutationFn: (force: boolean) =>
      googleCalendarService.createContactAppointment(client.id, contactId, {
        calendarId: form.calendarId,
        date: form.date,
        time: form.time,
        durationMinutes: form.durationMinutes,
        title: form.title.trim() || undefined,
        notes: form.notes.trim() || undefined,
        force,
      }),
    onSuccess: (appointment) => {
      toast.success(`Reunião marcada: ${appointment.description}`);
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey(client.id, contactId) });
      onDone();
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.data?.code === "CALENDAR_BUSY") {
        setConflict(requestErrorMessage(error));
        return;
      }
      toast.error(requestErrorMessage(error));
    },
  });

  const cancel = useMutation({
    mutationFn: (appointmentId: string) => googleCalendarService.cancelContactAppointment(client.id, contactId, appointmentId),
    onSuccess: () => {
      toast.success("Reunião desmarcada");
      queryClient.invalidateQueries({ queryKey: appointmentsQueryKey(client.id, contactId) });
    },
    onError: (error) => toast.error(requestErrorMessage(error)),
  });

  const calendar = options.calendars.find((item) => item.id === form.calendarId);
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const update = (patch: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...patch }));
    setConflict(null);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Agendar reunião</DialogTitle>
        <DialogDescription>Marca no Google Agenda com {contactName}. O contato recebe os lembretes configurados.</DialogDescription>
      </DialogHeader>

      {!connected ? (
        <div className="space-y-3 text-sm">
          <p>
            {options.status === "REVOKED"
              ? "A conexão com o Google Agenda caiu e precisa ser refeita."
              : "O Google Agenda ainda não está conectado."}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to={`${baseUrl}/configuration?tab=googleCalendar`}>Abrir configurações do Google Agenda</Link>
          </Button>
        </div>
      ) : (
        <>
          <form onSubmit={submit} className="grid gap-4">
            {options.calendars.length > 1 && (
              <div className="grid gap-1.5">
                <Label htmlFor="meeting-calendar">Agenda</Label>
                <select
                  id="meeting-calendar"
                  className={selectClassName}
                  value={form.calendarId}
                  onChange={(event) => update({ calendarId: event.target.value })}
                >
                  {options.calendars.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.primary ? " (principal)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="meeting-date">Dia</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(event) => update({ date: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="meeting-time">Horário</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  required
                  step={300}
                  value={form.time}
                  onChange={(event) => update({ time: event.target.value })}
                />
              </div>
              <div className="col-span-2 grid gap-1.5 sm:col-span-1">
                <Label htmlFor="meeting-duration">Duração</Label>
                <select
                  id="meeting-duration"
                  className={selectClassName}
                  value={form.durationMinutes}
                  onChange={(event) => update({ durationMinutes: Number(event.target.value) })}
                >
                  {[...new Set([...DURATIONS, form.durationMinutes])]
                    .sort((a, b) => a - b)
                    .map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes < 60 ? `${minutes} min` : `${minutes / 60} h`.replace(".", ",")}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {calendar && calendar.timeZone !== browserZone && (
              <p className="text-muted-foreground -mt-2 text-xs">Horário no fuso da agenda ({calendar.timeZone}).</p>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="meeting-title">Título do evento</Label>
              <Input id="meeting-title" maxLength={200} value={form.title} onChange={(event) => update({ title: event.target.value })} />
              <p className="text-muted-foreground text-xs">{"{{nome}}"} vira o nome do contato.</p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="meeting-notes">Observação (opcional)</Label>
              <textarea
                id="meeting-notes"
                rows={2}
                maxLength={1000}
                className={textareaClassName}
                value={form.notes}
                onChange={(event) => update({ notes: event.target.value })}
                placeholder="Ex.: reunião online, levar proposta"
              />
            </div>

            {conflict ? (
              <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  {conflict}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={create.isPending} onClick={() => create.mutate(true)}>
                    Marcar mesmo assim
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setConflict(null)}>
                    Escolher outro horário
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="submit" disabled={create.isPending || !form.calendarId}>
                <CalendarCheck className="h-4 w-4" />
                {create.isPending ? "Marcando..." : "Marcar no Google Agenda"}
              </Button>
            )}
          </form>

          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-semibold">Próximas reuniões de {contactName}</p>
            {appointments.isLoading && <LoadingState label="Conferindo a agenda..." className="py-3" />}
            {appointments.isError && (
              <ErrorState
                message={requestErrorMessage(appointments.error)}
                onRetry={() => appointments.refetch()}
                isRetrying={appointments.isFetching}
                className="py-3"
              />
            )}
            {appointments.data?.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma reunião marcada.</p>}
            <ul className="space-y-2">
              {appointments.data?.map((appointment) => (
                <li key={appointment.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {appointment.source === "AI" && (
                      <span title="Marcada pelo agente de IA">
                        <Bot className="text-muted-foreground h-4 w-4 shrink-0" />
                      </span>
                    )}
                    <span className="truncate">{appointment.description}</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive shrink-0"
                    disabled={cancel.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Desmarcar a reunião?",
                        description: `${appointment.description}. O evento sai do Google Agenda.`,
                        confirmLabel: "Desmarcar",
                        destructive: true,
                      });
                      if (ok) cancel.mutate(appointment.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Desmarcar
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {confirmDialog}
    </>
  );
};
