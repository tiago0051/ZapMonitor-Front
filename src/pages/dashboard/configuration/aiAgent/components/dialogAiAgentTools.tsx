import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { WeeklyHoursEditor } from "@/components/weeklyHoursEditor";
import { googleCalendarService } from "@/services/api/googleCalendarService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Wrench } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import z from "zod";

const selectClassName =
  "border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Cuiaba",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Rio_Branco",
  "America/Noronha",
];

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const integer = (min: number, max: number, label: string) =>
  z
    .number({ message: `Informe ${label}` })
    .int("Use um número inteiro")
    .min(min, `Mínimo ${min}`)
    .max(max, `Máximo ${max}`);

const schema = z
  .object({
    enabled: z.boolean(),
    calendarId: z.string(),
    timeZone: z.string().min(1),
    weeklyHours: z.array(z.object({ weekday: z.number(), start: z.string(), end: z.string() })),
    sessionMinutes: integer(10, 480, "a duração"),
    bufferMinutes: integer(0, 240, "o intervalo"),
    minNoticeHours: integer(0, 720, "a antecedência"),
    maxDaysAhead: integer(1, 365, "os dias"),
    changeMinNoticeHours: integer(0, 720, "o prazo"),
    maxFutureAppointmentsPerContact: integer(1, 20, "o limite"),
    eventTitle: z.string().trim().min(1, "Informe o título do evento").max(200, "Máximo de 200 caracteres"),
  })
  .superRefine((values, context) => {
    if (values.weeklyHours.some((interval) => !interval.start || !interval.end || toMinutes(interval.start) >= toMinutes(interval.end)))
      context.addIssue({ code: "custom", path: ["weeklyHours"], message: "Em cada horário, o início precisa ser antes do fim" });
    else if (values.weeklyHours.some((interval) => toMinutes(interval.end) - toMinutes(interval.start) < values.sessionMinutes))
      context.addIssue({ code: "custom", path: ["weeklyHours"], message: "Há um horário mais curto que a duração da sessão" });

    if (!values.enabled) return;
    if (!values.calendarId) context.addIssue({ code: "custom", path: ["calendarId"], message: "Escolha a agenda" });
    if (values.weeklyHours.length === 0)
      context.addIssue({ code: "custom", path: ["weeklyHours"], message: "Informe ao menos um horário de atendimento" });
  });

type FormValues = z.infer<typeof schema>;

type DialogAiAgentToolsProps = {
  clientId: string;
  aiAgent: AiAgent;
};

/** Ferramentas do agente; por enquanto, o Google Agenda com as regras de agendamento. */
export const DialogAiAgentTools: FC<DialogAiAgentToolsProps> = ({ clientId, aiAgent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const toolQuery = useQuery({
    queryKey: ["aiAgentTool", "googleCalendar", clientId, aiAgent.id],
    queryFn: () => googleCalendarService.findAgentTool({ params: { clientId, aiAgentId: aiAgent.id } }),
    enabled: isOpen,
  });
  const tool = toolQuery.data;

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const enabled = useWatch({ control: form.control, name: "enabled" });

  useEffect(() => {
    if (!isOpen || !tool) return;

    // Sem agenda escolhida, sugere a principal da conta
    const calendarId = tool.rules.calendarId || tool.calendars.find((calendar) => calendar.primary)?.id || "";
    form.reset({ enabled: tool.enabled, ...tool.rules, calendarId });
  }, [isOpen, tool]);

  const save = useMutation({
    mutationFn: googleCalendarService.saveAgentTool,
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      queryClient.setQueryData(["aiAgentTool", "googleCalendar", clientId, aiAgent.id], saved);
      toast.success(saved.enabled ? "Google Agenda ligado no agente" : "Ferramentas do agente salvas");
      setIsOpen(false);
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) =>
    save.mutate({ params: { clientId, aiAgentId: aiAgent.id }, body: { ...values, eventTitle: values.eventTitle.trim() } });

  const isConnected = tool?.connection.connected && tool.connection.status === "CONNECTED";
  const goToConnection = () => {
    setIsOpen(false);
    setSearchParams({ tab: "googleCalendar" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground h-8 w-8 shrink-0"
          aria-label="Ferramentas do agente"
          title="Ferramentas"
        >
          <Wrench className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ferramentas de {aiAgent.name}</DialogTitle>
          <DialogDescription>
            Com o Google Agenda ligado, o agente consulta os horários livres e marca, remarca e desmarca sessões sozinho, sempre dentro das
            regras abaixo. Cada contato só mexe nas próprias sessões.
          </DialogDescription>
        </DialogHeader>

        {toolQuery.isLoading && <LoadingState />}
        {toolQuery.isError && <ErrorState message="Não foi possível carregar as ferramentas" onRetry={() => toolQuery.refetch()} />}

        {tool && (
          <Form {...form}>
            <form id={`form-ai-agent-tools-${aiAgent.id}`} onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <div className="flex-1 space-y-1">
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            disabled={!isConnected && !field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                          />
                        </FormControl>
                        <FormLabel className="font-medium">Google Agenda</FormLabel>
                      </FormItem>
                    )}
                  />
                  {isConnected ? (
                    <p className="text-muted-foreground text-sm">Conta conectada: {tool.connection.googleEmail}</p>
                  ) : (
                    <p className="flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {tool.connection.connected
                        ? "O Google recusou o acesso à agenda. Reconecte a conta para o agente voltar a usar a agenda."
                        : "Conecte uma conta do Google antes de ligar a agenda no agente."}
                      <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={goToConnection}>
                        Ir para Google Agenda
                      </Button>
                    </p>
                  )}
                </div>
              </div>

              <fieldset disabled={!enabled} className="space-y-5 disabled:opacity-60">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="calendarId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agenda</FormLabel>
                        <FormControl>
                          <select className={selectClassName} {...field}>
                            <option value="">Escolha a agenda</option>
                            {tool.calendars.map((calendar) => (
                              <option key={calendar.id} value={calendar.id}>
                                {calendar.summary}
                                {calendar.primary ? " (principal)" : ""}
                              </option>
                            ))}
                            {field.value && !tool.calendars.some((calendar) => calendar.id === field.value) && (
                              <option value={field.value}>{field.value}</option>
                            )}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeZone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuso horário</FormLabel>
                        <FormControl>
                          <select className={selectClassName} {...field}>
                            {[...new Set([field.value, ...TIMEZONES].filter(Boolean))].map((timeZone) => (
                              <option key={timeZone} value={timeZone}>
                                {timeZone}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="weeklyHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horários de atendimento</FormLabel>
                      <FormDescription>As sessões começam no início de cada horário, uma depois da outra com o intervalo.</FormDescription>
                      <WeeklyHoursEditor value={field.value ?? []} onChange={field.onChange} disabled={!enabled} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <NumberField form={form} name="sessionMinutes" label="Duração da sessão (min)" />
                  <NumberField form={form} name="bufferMinutes" label="Intervalo entre sessões (min)" />
                  <NumberField form={form} name="minNoticeHours" label="Antecedência mínima (horas)" />
                  <NumberField form={form} name="maxDaysAhead" label="Marcar até (dias à frente)" />
                  <NumberField
                    form={form}
                    name="changeMinNoticeHours"
                    label="Remarcar/desmarcar até (horas antes)"
                    description="Depois disso, o agente passa para a equipe."
                  />
                  <NumberField form={form} name="maxFutureAppointmentsPerContact" label="Sessões futuras por contato" />
                </div>

                <FormField
                  control={form.control}
                  name="eventTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do evento</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>{"{{nome}}"} vira o nome do contato.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
            </form>
          </Form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form={`form-ai-agent-tools-${aiAgent.id}`} disabled={!tool || save.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type NumberFieldName =
  "sessionMinutes" | "bufferMinutes" | "minNoticeHours" | "maxDaysAhead" | "changeMinNoticeHours" | "maxFutureAppointmentsPerContact";

const NumberField: FC<{
  form: ReturnType<typeof useForm<FormValues>>;
  name: NumberFieldName;
  label: string;
  description?: string;
}> = ({ form, name, label, description }) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input
            type="number"
            {...field}
            value={Number.isNaN(field.value) ? "" : field.value}
            onChange={(e) => field.onChange(e.target.valueAsNumber)}
          />
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    )}
  />
);
