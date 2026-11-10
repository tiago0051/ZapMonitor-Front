import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { templateCategoryLabel, templateStatusInfo } from "@/components/whatsappTemplate/templateUtils";
import { cn } from "@/lib/utils";
import { googleCalendarService } from "@/services/api/googleCalendarService";
import { templateService } from "@/services/api/templateService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { formatConfigurationPhoneNumber, isWhatsappWeb } from "@/utils/whatsappConfiguration";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BellRing, CheckCircle2, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";
const textareaClassName =
  "border-input dark:bg-input/30 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const OFFSET_PRESETS = [
  { minutes: 2880, label: "2 dias antes" },
  { minutes: 1440, label: "1 dia antes" },
  { minutes: 240, label: "4 horas antes" },
  { minutes: 120, label: "2 horas antes" },
  { minutes: 60, label: "1 hora antes" },
];
const MAX_OFFSETS = 3;

const VARIABLE_SOURCES: { value: AppointmentReminderVariableSource; label: string; example: string }[] = [
  { value: "contact_name", label: "Primeiro nome do contato", example: "Maria" },
  { value: "title", label: "Título do evento", example: "Consulta" },
  { value: "weekday_date", label: "Dia da semana e data", example: "Terça-feira, 12/11" },
  { value: "date", label: "Data", example: "12/11" },
  { value: "time", label: "Hora", example: "14:30" },
];

const PLACEHOLDERS = ["{nome}", "{titulo}", "{dia_semana}", "{data}", "{hora}"];

const describeOffset = (minutes: number) => {
  const preset = OFFSET_PRESETS.find((item) => item.minutes === minutes);
  if (preset) return preset.label;
  if (minutes % 1440 === 0) return `${minutes / 1440} dias antes`;
  if (minutes % 60 === 0) return `${minutes / 60} horas antes`;
  return `${minutes} minutos antes`;
};

const skipLabel: Record<NonNullable<AppointmentReminder["skipReason"]>, string> = {
  NO_PHONE: "Sem telefone no evento",
  NO_TEMPLATE: "Sem modelo para a janela fechada",
  SUPERSEDED: "Substituído por um lembrete mais próximo",
  CANCELED: "Agendamento desmarcado",
};

const reminderStatus = (reminder: AppointmentReminder) => {
  if (reminder.response === "CONFIRMED")
    return { label: "Confirmou", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" };
  if (reminder.response === "RESCHEDULE")
    return { label: "Pediu para remarcar", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
  if (reminder.status === "SENT") return { label: "Enviado", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" };
  if (reminder.status === "FAILED") return { label: "Falhou", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" };
  return { label: "Não enviado", className: "bg-muted text-muted-foreground" };
};

type AppointmentRemindersProps = { clientId: string; calendars: GoogleCalendarItem[] };

/** Lembretes dos eventos da agenda pelo WhatsApp, com Confirmar/Remarcar e o histórico dos envios. */
export const AppointmentReminders: FC<AppointmentRemindersProps> = ({ clientId, calendars }) => {
  const settingsQuery = useQuery({
    queryKey: ["googleCalendar", "reminderSettings", clientId],
    queryFn: () => googleCalendarService.findReminderSettings({ params: { clientId } }),
  });

  if (!settingsQuery.data) return <LoadingState label="Carregando lembretes..." />;

  return <AppointmentRemindersForm clientId={clientId} calendars={calendars} initial={settingsQuery.data} />;
};

const AppointmentRemindersForm: FC<AppointmentRemindersProps & { initial: AppointmentReminderSettings }> = ({
  clientId,
  calendars,
  initial,
}) => {
  const queryClient = useQueryClient();
  const [customHours, setCustomHours] = useState("");
  // Primeira configuração já vem com a agenda principal marcada
  const [form, setForm] = useState<AppointmentReminderSettings>(() => {
    const primary = calendars.find((calendar) => calendar.primary);
    return { ...initial, calendarIds: initial.calendarIds.length || !primary ? initial.calendarIds : [primary.id] };
  });

  const remindersQuery = useQuery({
    queryKey: ["googleCalendar", "reminders", clientId],
    queryFn: () => googleCalendarService.findReminders({ params: { clientId } }),
    refetchInterval: 60_000,
  });
  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", clientId],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId }, queries: { page: 1, take: 100 } }),
  });

  const configurations = (configurationsQuery.data?.items ?? []).filter((configuration) => configuration.enabled);
  const configuration = configurations.find((item) => item.id === form.whatsappConfigurationId);
  const usesTemplate = !!configuration && !isWhatsappWeb(configuration);

  const templatesQuery = useQuery({
    queryKey: ["whatsappTemplates", clientId, form.whatsappConfigurationId],
    queryFn: () => templateService.findAll({ params: { clientId }, queries: { configurationId: form.whatsappConfigurationId! } }),
    enabled: usesTemplate,
  });
  const templates = (templatesQuery.data ?? []).filter((template) => template.synced && template.category !== "AUTHENTICATION");
  const template = templates.find((item) => item.id === form.templateId) ?? null;

  const update = (changes: Partial<AppointmentReminderSettings>) => setForm((current) => ({ ...current, ...changes }));

  const save = useMutation({
    mutationFn: googleCalendarService.saveReminderSettings,
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      setForm(saved);
      queryClient.setQueryData(["googleCalendar", "reminderSettings", clientId], saved);
      toast.success(saved.enabled ? "Lembretes ligados" : "Configuração dos lembretes salva");
    },
  });

  const createTemplate = useMutation({
    mutationFn: googleCalendarService.createReminderTemplate,
    onError: requestErrorHandling,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["whatsappTemplates", clientId] });
      const settings = await googleCalendarService.findReminderSettings({ params: { clientId } });
      update({ templateId: settings.templateId, templateVariables: settings.templateVariables });
      toast.success(
        created.status === "APPROVED" ? "Modelo de lembrete aprovado pela Meta" : "Modelo de lembrete enviado para aprovação da Meta",
        { description: "Ele já ficou escolhido aqui. Salve para ligar os lembretes." },
      );
    },
  });

  const busy = save.isPending || createTemplate.isPending;
  const offsets = [...form.offsetsMinutes].sort((a, b) => b - a);

  const toggleOffset = (minutes: number) =>
    update({
      offsetsMinutes: offsets.includes(minutes) ? offsets.filter((item) => item !== minutes) : [...offsets, minutes].slice(0, MAX_OFFSETS),
    });

  const addCustomOffset = () => {
    const hours = Number(customHours.replace(",", "."));
    if (!hours || hours < 0.25 || hours > 168) return toast.error("Informe de 0,25 a 168 horas");
    const minutes = Math.round(hours * 60);
    if (!offsets.includes(minutes)) update({ offsetsMinutes: [...offsets, minutes].slice(0, MAX_OFFSETS) });
    setCustomHours("");
  };

  const selectTemplate = (templateId: string) => {
    const selected = templates.find((item) => item.id === templateId);
    // Sugere o dado de cada variável pela ordem: nome, título, data, hora
    const defaults: AppointmentReminderVariableSource[] = ["contact_name", "title", "weekday_date", "time"];
    update({
      templateId: templateId || null,
      templateVariables: selected
        ? Object.fromEntries(
            selected.parameters
              .filter((parameter) => parameter.source !== "BUTTON")
              .map((parameter, index) => [parameter.key, form.templateVariables?.[parameter.key] ?? defaults[index] ?? "contact_name"]),
          )
        : null,
    });
  };

  const templateParameters = template?.parameters.filter((parameter) => parameter.source !== "BUTTON") ?? [];
  const hasButtonParameters = !!template?.parameters.some((parameter) => parameter.source === "BUTTON");

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-4 space-y-0 sm:flex-row sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Lembretes de agendamento
          </CardTitle>
          <CardDescription>
            O ZapMonitor lê a agenda e manda o lembrete pelo WhatsApp na antecedência escolhida. O contato confirma ou pede para remarcar
            por botão, e a resposta aparece no evento: ✅ verde quando confirma, 🔁 laranja quando quer remarcar.
          </CardDescription>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch checked={form.enabled} disabled={busy} onCheckedChange={(checked) => update({ enabled: checked })} />
          {form.enabled ? "Ligado" : "Desligado"}
        </label>
      </CardHeader>

      <CardContent className="grid gap-6">
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold">Quais eventos</h3>
          <div className="grid gap-2">
            {calendars.map((calendar) => (
              <label key={calendar.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.calendarIds.includes(calendar.id)}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    update({
                      calendarIds: checked ? [...form.calendarIds, calendar.id] : form.calendarIds.filter((id) => id !== calendar.id),
                    })
                  }
                />
                {calendar.summary}
                {calendar.primary && <span className="text-muted-foreground text-xs">(principal)</span>}
              </label>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={form.includeManualEvents}
              disabled={busy}
              onCheckedChange={(checked) => update({ includeManualEvents: checked === true })}
            />
            <span>
              Também eventos criados à mão na agenda
              <span className="text-muted-foreground block text-xs">
                Os marcados pela IA sempre recebem. Nos outros, o lembrete vai para o telefone escrito no título, na descrição ou no local
                (ex.: "WhatsApp: (11) 99999-9999"). Eventos sem telefone ficam de fora.
              </span>
            </span>
          </label>
        </section>

        <section className="grid gap-3">
          <h3 className="text-sm font-semibold">Quando enviar</h3>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...OFFSET_PRESETS.map((item) => item.minutes), ...offsets])]
              .sort((a, b) => b - a)
              .map((minutes) => {
                const selected = offsets.includes(minutes);
                return (
                  <Button
                    key={minutes}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    disabled={busy || (!selected && offsets.length >= MAX_OFFSETS)}
                    onClick={() => toggleOffset(minutes)}
                  >
                    {selected && <CheckCircle2 className="h-4 w-4" />}
                    {describeOffset(minutes)}
                  </Button>
                );
              })}
          </div>
          <div className="flex max-w-xs items-center gap-2">
            <Input
              aria-label="Outra antecedência em horas"
              inputMode="decimal"
              placeholder="Outra (horas)"
              value={customHours}
              disabled={busy || offsets.length >= MAX_OFFSETS}
              onChange={(event) => setCustomHours(event.target.value)}
            />
            <Button type="button" size="sm" variant="outline" disabled={busy || !customHours} onClick={addCustomOffset}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Até {MAX_OFFSETS} lembretes por evento. Evento marcado em cima da hora recebe só o lembrete mais próximo.
          </p>
        </section>

        <section className="grid gap-3">
          <h3 className="text-sm font-semibold">Mensagem</h3>
          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="reminder-configuration">Número que envia</Label>
            <select
              id="reminder-configuration"
              className={selectClassName}
              value={form.whatsappConfigurationId ?? ""}
              disabled={busy}
              onChange={(event) =>
                update({ whatsappConfigurationId: event.target.value || null, templateId: null, templateVariables: null })
              }
            >
              <option value="">Selecione</option>
              {configurations.map((item) => (
                <option key={item.id} value={item.id}>
                  {formatConfigurationPhoneNumber(item)}
                  {isWhatsappWeb(item) ? " · QR code" : ""}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.askConfirmation}
              disabled={busy}
              onCheckedChange={(checked) => update({ askConfirmation: checked === true })}
            />
            Pedir confirmação com os botões Confirmar e Remarcar
          </label>

          {usesTemplate && (
            <div className="bg-muted/40 grid gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Modelo aprovado (quando o contato não falou nas últimas 24h)</p>
                <p className="text-muted-foreground text-xs">
                  A Meta só deixa iniciar conversa com modelo aprovado, então a maioria dos lembretes sai por ele. Use um modelo de
                  Utilidade
                  {form.askConfirmation ? " com os botões de resposta rápida Confirmar e Remarcar" : ""}.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  aria-label="Modelo do lembrete"
                  className={selectClassName}
                  value={form.templateId ?? ""}
                  disabled={busy || templatesQuery.isLoading}
                  onChange={(event) => selectTemplate(event.target.value)}
                >
                  <option value="">{templatesQuery.isLoading ? "Carregando..." : "Selecione o modelo"}</option>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {templateCategoryLabel[item.category ?? ""] ?? item.category} · {templateStatusInfo(item).label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={busy}
                  onClick={() =>
                    createTemplate.mutate({
                      params: { clientId },
                      body: { configurationId: form.whatsappConfigurationId!, askConfirmation: form.askConfirmation },
                    })
                  }
                >
                  <Sparkles className="h-4 w-4" />
                  {createTemplate.isPending ? "Criando..." : "Criar modelo pronto"}
                </Button>
              </div>
              {template && template.status !== "APPROVED" && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Este modelo está "{templateStatusInfo(template).label}". Os lembretes por modelo só saem depois da aprovação da Meta.
                </p>
              )}
              {template && form.askConfirmation && !template.buttons.some((button) => button.type === "QUICK_REPLY") && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Este modelo não tem botões de resposta rápida; o contato vai precisar digitar "confirmar" ou "remarcar".
                </p>
              )}
              {hasButtonParameters && (
                <p className="text-destructive text-sm">Modelos com link dinâmico ou código no botão não servem para lembrete.</p>
              )}
              {templateParameters.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {templateParameters.map((parameter) => (
                    <div key={parameter.key} className="grid gap-1">
                      <Label htmlFor={`reminder-variable-${parameter.key}`}>{parameter.label}</Label>
                      <select
                        id={`reminder-variable-${parameter.key}`}
                        className={selectClassName}
                        value={form.templateVariables?.[parameter.key] ?? ""}
                        disabled={busy}
                        onChange={(event) =>
                          update({ templateVariables: { ...form.templateVariables, [parameter.key]: event.target.value } })
                        }
                      >
                        <option value="">Selecione</option>
                        {VARIABLE_SOURCES.map((source) => (
                          <option key={source.value} value={source.value}>
                            {source.label} (ex.: {source.example})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="reminder-message">
              {usesTemplate ? "Texto quando a conversa está aberta (contato falou nas últimas 24h)" : "Texto do lembrete"}
            </Label>
            <textarea
              id="reminder-message"
              rows={3}
              maxLength={1000}
              value={form.message}
              disabled={busy}
              onChange={(event) => update({ message: event.target.value })}
              className={textareaClassName}
            />
            <p className="text-muted-foreground text-xs">
              Use {PLACEHOLDERS.join(", ")}.
              {configuration && isWhatsappWeb(configuration) && form.askConfirmation
                ? " No número por QR code os botões aparecem como opções numeradas."
                : ""}
            </p>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="button" disabled={busy} onClick={() => save.mutate({ params: { clientId }, body: form })}>
            {save.isPending ? "Salvando..." : "Salvar lembretes"}
          </Button>
        </div>

        <section className="grid gap-3 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Últimos lembretes</h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={remindersQuery.isFetching}
              onClick={() => remindersQuery.refetch()}
              aria-label="Atualizar lista de lembretes"
            >
              <RotateCcw className={cn("h-4 w-4", remindersQuery.isFetching && "animate-spin")} />
            </Button>
          </div>
          {(remindersQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum lembrete ainda. Eles aparecem aqui conforme os eventos chegam na antecedência.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {remindersQuery.data!.map((reminder) => {
                const status = reminderStatus(reminder);
                return (
                  <li key={reminder.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{reminder.eventTitle || "Evento sem título"}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(reminder.eventStartAt), "dd/MM 'às' HH:mm")} · {describeOffset(reminder.offsetMinutes)}
                        {reminder.phoneNumber && ` · ${reminder.phoneNumber}`}
                      </p>
                      {reminder.skipReason && <p className="text-muted-foreground text-xs">{skipLabel[reminder.skipReason]}</p>}
                      {reminder.errorMessage && (
                        <p className="text-destructive flex items-center gap-1 text-xs">
                          <X className="h-3 w-3" />
                          {reminder.errorMessage}
                        </p>
                      )}
                    </div>
                    <span className={cn("self-start rounded px-1.5 py-0.5 text-[11px] font-medium sm:self-center", status.className)}>
                      {status.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
};
