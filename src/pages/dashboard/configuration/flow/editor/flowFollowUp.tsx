import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { templateCategoryLabel, templateStatusInfo } from "@/components/whatsappTemplate/templateUtils";
import { templateService } from "@/services/api/templateService";
import { formatConfigurationPhoneNumber, isWhatsappWeb } from "@/utils/whatsappConfiguration";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Clock, Plus, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { useWhatsappConfigurations } from "../flowLinks";
import { createFlowId } from "./flowNodeConfig";

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";
const textareaClassName =
  "border-input dark:bg-input/30 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

// Espelham os limites do back
const MAX_STEPS = 10;
const MAX_DELAY_MINUTES = 7 * 24 * 60;
const MAX_TEXT = 1000;

const VARIABLE_SOURCES = [
  { value: "contact_name", label: "Nome do contato", example: "Maria Souza" },
  { value: "contact_first_name", label: "Primeiro nome", example: "Maria" },
];
// Opção do seletor que libera o campo de texto fixo
const FIXED_TEXT = "__fixed__";

type DelayUnit = "min" | "h" | "d";
const UNIT_MINUTES: Record<DelayUnit, number> = { min: 1, h: 60, d: 1440 };

// Mostra na maior unidade que divide sem sobra: 120 → 2 h, 90 → 90 min
const splitDelay = (minutes: number): { value: number; unit: DelayUnit } => {
  if (minutes >= 1440 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "d" };
  if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: "h" };
  return { value: minutes, unit: "min" };
};

const formatDelay = (minutes: number) => {
  const { value, unit } = splitDelay(minutes);
  return `${value} ${unit === "d" ? (value === 1 ? "dia" : "dias") : unit}`;
};

const newStep = (
  delayMinutes: number,
  text = "Oi {{nome}}, ainda está por aí? Posso te ajudar com mais alguma coisa?",
): FlowFollowUpStep => ({
  id: createFlowId(),
  delayMinutes,
  kind: "text",
  text,
});

// O exemplo mais comum: 5 min, 15 min, 45 min e 2 h
const exampleSteps = (): FlowFollowUpStep[] => [
  newStep(5, "Oi {{nome}}, ainda está por aí? 😊"),
  newStep(15, "Ficou com alguma dúvida? Posso te ajudar no que precisar."),
  newStep(45, "{{nome}}, separei um tempinho para você. Quer continuar de onde paramos?"),
  newStep(120, "Vou deixar a conversa aberta por aqui. Quando quiser continuar, é só responder esta mensagem."),
];

const emptyFollowUp = (): FlowFollowUp => ({ enabled: true, steps: exampleSteps(), noReply: { action: "none", afterMinutes: 60 } });

const isStepValid = (step: FlowFollowUpStep) =>
  Number.isInteger(step.delayMinutes) &&
  step.delayMinutes >= 1 &&
  step.delayMinutes <= MAX_DELAY_MINUTES &&
  (step.kind === "text"
    ? !!step.text?.trim()
    : !!step.templateId && Object.values(step.templateVariables ?? {}).every((value) => !!value.trim()));

type FlowFollowUpButtonProps = {
  clientId: string;
  followUp: FlowFollowUp | null;
  whatsappConfigurationIds: string[];
  onChange: (followUp: FlowFollowUp | null) => void;
};

/** Botão do topo do editor com o resumo do follow-up; abre a configuração da sequência. */
export const FlowFollowUpButton: FC<FlowFollowUpButtonProps> = ({ clientId, followUp, whatsappConfigurationIds, onChange }) => {
  const [open, setOpen] = useState(false);
  const isOn = !!followUp?.enabled && followUp.steps.length > 0;

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start font-normal sm:w-44"
        title="Mensagens para quem parou de responder à IA ou à pergunta do fluxo"
        onClick={() => setOpen(true)}
      >
        <Clock className="h-4 w-4" />
        {isOn ? `${followUp.steps.length} envio(s)` : "Desligado"}
      </Button>
      {open && (
        <FlowFollowUpDialog
          clientId={clientId}
          initial={followUp}
          whatsappConfigurationIds={whatsappConfigurationIds}
          onClose={() => setOpen(false)}
          onApply={(value) => {
            onChange(value);
            setOpen(false);
          }}
        />
      )}
    </>
  );
};

type FlowFollowUpDialogProps = {
  clientId: string;
  initial: FlowFollowUp | null;
  whatsappConfigurationIds: string[];
  onClose: () => void;
  onApply: (followUp: FlowFollowUp | null) => void;
};

const FlowFollowUpDialog: FC<FlowFollowUpDialogProps> = ({ clientId, initial, whatsappConfigurationIds, onClose, onApply }) => {
  const [form, setForm] = useState<FlowFollowUp>(() => initial ?? emptyFollowUp());
  const noReply = form.noReply ?? { action: "none", afterMinutes: 60 };

  // Modelos são da conta do WhatsApp (WABA): lista os do número do fluxo, ou de outro número oficial escolhido aqui
  const configurations = useWhatsappConfigurations(clientId).filter((configuration) => !isWhatsappWeb(configuration));
  const preferred = configurations.find((configuration) => whatsappConfigurationIds.includes(configuration.id)) ?? configurations[0];
  const [templateConfigurationId, setTemplateConfigurationId] = useState<string | null>(null);
  const configurationId = templateConfigurationId ?? preferred?.id ?? null;
  const usesTemplates = form.steps.some((step) => step.kind === "template");

  const templatesQuery = useQuery({
    queryKey: ["whatsappTemplates", clientId, configurationId],
    queryFn: () => templateService.findAll({ params: { clientId }, queries: { configurationId: configurationId! } }),
    enabled: !!configurationId && usesTemplates,
  });
  const templates = (templatesQuery.data ?? []).filter((template) => template.synced && template.category !== "AUTHENTICATION");

  const update = (changes: Partial<FlowFollowUp>) => setForm((current) => ({ ...current, ...changes }));
  const updateStep = (stepId: string, changes: Partial<FlowFollowUpStep>) =>
    update({ steps: form.steps.map((step) => (step.id === stepId ? { ...step, ...changes } : step)) });
  const moveStep = (index: number, offset: number) => {
    const steps = [...form.steps];
    [steps[index], steps[index + offset]] = [steps[index + offset], steps[index]];
    update({ steps });
  };

  const selectTemplate = (step: FlowFollowUpStep, templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    const variables = template
      ? Object.fromEntries(
          template.parameters
            .filter((parameter) => parameter.source !== "BUTTON")
            .map((parameter) => [parameter.key, step.templateVariables?.[parameter.key] ?? "contact_first_name"]),
        )
      : undefined;
    updateStep(step.id, { templateId: templateId || undefined, templateVariables: variables });
  };

  const totalMinutes = form.steps.reduce((sum, step) => sum + (Number.isInteger(step.delayMinutes) ? step.delayMinutes : 0), 0);
  const isValid =
    !form.enabled ||
    (form.steps.length > 0 &&
      form.steps.every(isStepValid) &&
      (noReply.action === "none" || (Number.isInteger(noReply.afterMinutes) && noReply.afterMinutes >= 1)));

  const apply = () => {
    // Desligado e sem envios, a configuração some do fluxo
    if (!form.enabled && form.steps.length === 0) return onApply(null);
    onApply({ ...form, noReply });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Follow-up</DialogTitle>
          <DialogDescription>
            Quando o contato para de responder enquanto a IA ou uma pergunta do fluxo espera por ele, o ZapMonitor manda estas mensagens.
            Cada espera conta a partir da última mensagem enviada. Se o contato responder, a sequência para e recomeça na próxima mensagem
            que ficar sem resposta.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch checked={form.enabled} onCheckedChange={(enabled) => update({ enabled })} />
          {form.enabled ? "Follow-up ligado" : "Follow-up desligado"}
        </label>

        {form.enabled && (
          <div className="space-y-3">
            {form.steps.length === 0 && (
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 text-sm">
                Nenhum envio cadastrado.
                <Button type="button" variant="outline" size="sm" onClick={() => update({ steps: exampleSteps() })}>
                  Usar exemplo (5 min, 15 min, 45 min, 2 h)
                </Button>
              </div>
            )}

            {form.steps.map((step, index) => (
              <FollowUpStepCard
                key={step.id}
                step={step}
                index={index}
                total={form.steps.length}
                templates={templates}
                templatesLoading={templatesQuery.isLoading}
                hasOfficialNumber={!!configurationId}
                onChange={(changes) => updateStep(step.id, changes)}
                onSelectTemplate={(templateId) => selectTemplate(step, templateId)}
                onMove={(offset) => moveStep(index, offset)}
                onRemove={() => update({ steps: form.steps.filter((item) => item.id !== step.id) })}
              />
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={form.steps.length >= MAX_STEPS}
                onClick={() => update({ steps: [...form.steps, newStep(form.steps.at(-1)?.delayMinutes ?? 5)] })}
              >
                <Plus className="h-4 w-4" />
                Adicionar envio
              </Button>
              {form.steps.length > 0 && (
                <span className="text-muted-foreground text-xs">
                  Último envio cerca de {formatDelay(totalMinutes)} depois da mensagem sem resposta
                </span>
              )}
            </div>

            {usesTemplates && configurations.length > 1 && (
              <div className="grid gap-1">
                <Label htmlFor="follow-up-template-configuration">Listar modelos da conta do número</Label>
                <select
                  id="follow-up-template-configuration"
                  className={selectClassName}
                  value={configurationId ?? ""}
                  onChange={(event) => setTemplateConfigurationId(event.target.value)}
                >
                  {configurations.map((configuration) => (
                    <option key={configuration.id} value={configuration.id}>
                      {formatConfigurationPhoneNumber(configuration)}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">
                  O modelo só sai por números da mesma conta do WhatsApp em que ele foi aprovado.
                </p>
              </div>
            )}

            <div className="bg-muted/40 grid gap-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Se não responder depois do último envio</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  aria-label="Ação sem resposta"
                  className={selectClassName}
                  value={noReply.action}
                  onChange={(event) => update({ noReply: { ...noReply, action: event.target.value as FlowFollowUpNoReplyAction } })}
                >
                  <option value="none">Não fazer nada (a conversa fica com a IA)</option>
                  <option value="queue">Mandar para a fila de atendimento</option>
                  <option value="end">Finalizar o atendimento</option>
                </select>
                {noReply.action !== "none" && (
                  <DelayInput
                    label="depois de"
                    minutes={noReply.afterMinutes}
                    onChange={(afterMinutes) => update({ noReply: { ...noReply, afterMinutes } })}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={apply}
            disabled={!isValid}
            title={isValid ? undefined : "Preencha a espera e a mensagem ou o modelo de cada envio"}
          >
            Aplicar
          </Button>
        </DialogFooter>
        <p className="text-muted-foreground text-right text-xs">Depois de aplicar, salve o rascunho e publique o fluxo.</p>
      </DialogContent>
    </Dialog>
  );
};

type FollowUpStepCardProps = {
  step: FlowFollowUpStep;
  index: number;
  total: number;
  templates: WhatsappTemplate[];
  templatesLoading: boolean;
  hasOfficialNumber: boolean;
  onChange: (changes: Partial<FlowFollowUpStep>) => void;
  onSelectTemplate: (templateId: string) => void;
  onMove: (offset: number) => void;
  onRemove: () => void;
};

const FollowUpStepCard: FC<FollowUpStepCardProps> = ({
  step,
  index,
  total,
  templates,
  templatesLoading,
  hasOfficialNumber,
  onChange,
  onSelectTemplate,
  onMove,
  onRemove,
}) => {
  const template = templates.find((item) => item.id === step.templateId) ?? null;
  const parameters = template?.parameters.filter((parameter) => parameter.source !== "BUTTON") ?? [];

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <span className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full text-xs font-semibold">
          {index + 1}
        </span>
        <div className="min-w-56 flex-1">
          <DelayInput
            label={index === 0 ? "Esperar depois da mensagem sem resposta" : "Esperar depois do envio anterior"}
            minutes={step.delayMinutes}
            onChange={(delayMinutes) => onChange({ delayMinutes })}
          />
        </div>
        <div className="grid w-40 gap-1">
          <Label htmlFor={`follow-up-kind-${step.id}`}>Enviar</Label>
          <select
            id={`follow-up-kind-${step.id}`}
            className={selectClassName}
            value={step.kind}
            onChange={(event) => onChange({ kind: event.target.value as FlowFollowUpStep["kind"] })}
          >
            <option value="text">Texto</option>
            <option value="template">Modelo aprovado</option>
          </select>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Subir envio" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Descer envio"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Remover envio" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {step.kind === "text" ? (
        <div className="grid gap-1">
          <textarea
            aria-label={`Mensagem do envio ${index + 1}`}
            rows={2}
            maxLength={MAX_TEXT}
            className={textareaClassName}
            value={step.text ?? ""}
            onChange={(event) => onChange({ text: event.target.value })}
          />
          <p className="text-muted-foreground text-xs">
            Use {"{{nome}}"} para o nome do contato. Texto só sai com a conversa aberta (contato falou nas últimas 24h); fora disso o envio
            é pulado. Para depois de 24h, use um modelo aprovado.
          </p>
        </div>
      ) : !hasOfficialNumber ? (
        <p className="text-destructive text-sm">
          Modelos precisam de um número da API oficial do WhatsApp; números por QR code não enviam modelos.
        </p>
      ) : (
        <div className="grid gap-2">
          <select
            aria-label={`Modelo do envio ${index + 1}`}
            className={selectClassName}
            value={step.templateId ?? ""}
            disabled={templatesLoading}
            onChange={(event) => onSelectTemplate(event.target.value)}
          >
            <option value="">{templatesLoading ? "Carregando..." : "Selecione o modelo"}</option>
            {/* Modelo escolhido antes, de outra conta, continua visível */}
            {step.templateId && !template && !templatesLoading && (
              <option value={step.templateId}>Modelo de outra conta do WhatsApp</option>
            )}
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {templateCategoryLabel[item.category ?? ""] ?? item.category} · {templateStatusInfo(item).label}
              </option>
            ))}
          </select>
          {template?.bodyText && <p className="bg-muted/40 rounded-md p-2 text-sm whitespace-pre-wrap">{template.bodyText}</p>}
          {template && template.status !== "APPROVED" && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Este modelo está "{templateStatusInfo(template).label}". O envio só sai depois da aprovação da Meta.
            </p>
          )}
          {template?.headerFormat && template.headerFormat !== "TEXT" && (
            <p className="text-destructive text-sm">Modelos com imagem, vídeo ou documento no cabeçalho não servem para o follow-up.</p>
          )}
          {template?.parameters.some((parameter) => parameter.source === "BUTTON") && (
            <p className="text-destructive text-sm">Modelos com link dinâmico ou código no botão não servem para o follow-up.</p>
          )}
          {parameters.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {parameters.map((parameter) => (
                <VariableInput
                  key={parameter.key}
                  id={`follow-up-${step.id}-${parameter.key}`}
                  label={parameter.label}
                  value={step.templateVariables?.[parameter.key] ?? ""}
                  onChange={(value) => onChange({ templateVariables: { ...step.templateVariables, [parameter.key]: value } })}
                />
              ))}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Modelo sai mesmo depois das 24h, mas a Meta cobra por envio. Modelos de Marketing são cobrados mesmo com a conversa aberta.
          </p>
        </div>
      )}
    </div>
  );
};

const VariableInput: FC<{ id: string; label: string; value: string; onChange: (value: string) => void }> = ({
  id,
  label,
  value,
  onChange,
}) => {
  const isSource = VARIABLE_SOURCES.some((source) => source.value === value);
  const [isFixed, setIsFixed] = useState(!isSource && !!value);

  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={selectClassName}
        value={isFixed ? FIXED_TEXT : value}
        onChange={(event) => {
          const fixed = event.target.value === FIXED_TEXT;
          setIsFixed(fixed);
          onChange(fixed ? "" : event.target.value);
        }}
      >
        <option value="">Selecione</option>
        {VARIABLE_SOURCES.map((source) => (
          <option key={source.value} value={source.value}>
            {source.label} (ex.: {source.example})
          </option>
        ))}
        <option value={FIXED_TEXT}>Texto fixo</option>
      </select>
      {isFixed && (
        <Input aria-label={`${label}: texto fixo`} value={value} maxLength={200} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
};

const DelayInput: FC<{ label: string; minutes: number; onChange: (minutes: number) => void }> = ({ label, minutes, onChange }) => {
  const initial = Number.isInteger(minutes) && minutes > 0 ? splitDelay(minutes) : { value: NaN, unit: "min" as DelayUnit };
  const [unit, setUnit] = useState<DelayUnit>(initial.unit);
  const [value, setValue] = useState<number>(initial.value);

  const emit = (nextValue: number, nextUnit: DelayUnit) => {
    setValue(nextValue);
    setUnit(nextUnit);
    onChange(Number.isFinite(nextValue) ? Math.round(nextValue * UNIT_MINUTES[nextUnit]) : NaN);
  };

  const outOfRange = Number.isFinite(value) && (value * UNIT_MINUTES[unit] < 1 || value * UNIT_MINUTES[unit] > MAX_DELAY_MINUTES);

  return (
    <div className="grid gap-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="number"
          min={1}
          step={1}
          aria-label={`${label} (quantidade)`}
          aria-invalid={outOfRange || !Number.isFinite(value)}
          className="w-24"
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => emit(event.target.valueAsNumber, unit)}
        />
        <select
          aria-label={`${label} (unidade)`}
          className={`${selectClassName} w-28`}
          value={unit}
          onChange={(event) => emit(value, event.target.value as DelayUnit)}
        >
          <option value="min">minutos</option>
          <option value="h">horas</option>
          <option value="d">dias</option>
        </select>
      </div>
      {outOfRange && <p className="text-destructive text-xs">De 1 minuto a 7 dias.</p>}
    </div>
  );
};
