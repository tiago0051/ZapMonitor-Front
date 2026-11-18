import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format, setHours, setMinutes } from "date-fns";
import { CalendarClock, Mail, MessageCircle, NotebookPen, Phone, Users, type LucideIcon } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { crmTextareaClassName } from "../crmUtils";
import { activityTypeLabel } from "./dealEventText";
import { TaskTypePicker } from "./dealTasks";

const activityIcon: Record<DealActivityType, LucideIcon> = {
  CALL: Phone,
  MEETING: Users,
  NOTE: NotebookPen,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
};

const ACTIVITY_TYPES = Object.keys(activityTypeLabel) as DealActivityType[];

// Valor de um <input type="datetime-local"> no fuso do navegador
const toDateTimeInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");
// Próximo passo sugerido: amanhã às 9h
const defaultNextStepDate = () => toDateTimeInput(setMinutes(setHours(addDays(new Date(), 1), 9), 0));

/**
 * Registro do que aconteceu com o negócio (ligação, reunião, nota...), que entra no histórico e na linha do tempo do
 * contato. "Agendar próximo passo" cria uma tarefa junto, para o negócio não ficar parado.
 */
export const DealActivityForm: FC<{ deal: Deal }> = ({ deal }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<DealActivityType>("CALL");
  const [outcome, setOutcome] = useState("");
  const [text, setText] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDateTimeInput(new Date()));
  const [hasNextStep, setHasNextStep] = useState(false);
  const [nextStepTitle, setNextStepTitle] = useState("");
  const [nextStepType, setNextStepType] = useState<DealTaskType>("CALL");
  const [nextStepDueAt, setNextStepDueAt] = useState(defaultNextStepDate);

  const reset = () => {
    setType("CALL");
    setOutcome("");
    setText("");
    setOccurredAt(toDateTimeInput(new Date()));
    setHasNextStep(false);
    setNextStepTitle("");
    setNextStepType("CALL");
    setNextStepDueAt(defaultNextStepDate());
  };

  const logActivity = useMutation({
    mutationFn: crmService.logDealActivity,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "myTasks"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(hasNextStep ? "Atividade registrada e próximo passo agendado" : "Atividade registrada");
      reset();
      setIsOpen(false);
    },
  });

  const isNextStepValid = !hasNextStep || (!!nextStepTitle.trim() && !!nextStepDueAt);
  const isValid = (!!outcome.trim() || !!text.trim()) && !!occurredAt && isNextStepValid;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    logActivity.mutate({
      params: { clientId: client.id, dealId: deal.id },
      body: {
        type,
        outcome: outcome.trim() || null,
        text: text.trim() || null,
        occurredAt: new Date(occurredAt).toISOString(),
        ...(hasNextStep && {
          nextStep: { title: nextStepTitle.trim(), type: nextStepType, dueAt: new Date(nextStepDueAt).toISOString() },
        }),
      },
    });
  };

  if (!isOpen)
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <NotebookPen className="h-3.5 w-3.5" />
        Registrar atividade
      </Button>
    );

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-dashed p-3">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs font-medium">O que aconteceu?</legend>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_TYPES.map((item) => {
            const Icon = activityIcon[item];
            return (
              <button
                key={item}
                type="button"
                aria-pressed={type === item}
                onClick={() => setType(item)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                  type === item ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {activityTypeLabel[item]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="activity-outcome" className="text-xs">
          Resultado
        </Label>
        <Input
          id="activity-outcome"
          value={outcome}
          maxLength={200}
          onChange={(event) => setOutcome(event.target.value)}
          placeholder="Ex.: Pediu a proposta por e-mail"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="activity-text" className="text-xs">
          Detalhes (opcional)
        </Label>
        <textarea
          id="activity-text"
          value={text}
          maxLength={5000}
          onChange={(event) => setText(event.target.value)}
          className={crmTextareaClassName}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="activity-date" className="text-xs">
          Quando
        </Label>
        <Input
          id="activity-date"
          type="datetime-local"
          value={occurredAt}
          max={toDateTimeInput(new Date())}
          onChange={(event) => setOccurredAt(event.target.value)}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={hasNextStep} onCheckedChange={(checked) => setHasNextStep(checked === true)} />
        <CalendarClock className="text-muted-foreground h-3.5 w-3.5" />
        Agendar próximo passo
      </label>
      {hasNextStep && <TaskTypePicker value={nextStepType} onChange={setNextStepType} label="Tipo do próximo passo" />}
      {hasNextStep && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            aria-label="Próximo passo"
            value={nextStepTitle}
            maxLength={200}
            onChange={(event) => setNextStepTitle(event.target.value)}
            placeholder="Ex.: Ligar para fechar"
          />
          <Input
            type="datetime-local"
            aria-label="Prazo do próximo passo"
            value={nextStepDueAt}
            onChange={(event) => setNextStepDueAt(event.target.value)}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!isValid || logActivity.isPending}>
          Registrar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            reset();
            setIsOpen(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};
