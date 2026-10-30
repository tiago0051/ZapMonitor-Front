import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X } from "lucide-react";
import type { FC, ReactNode } from "react";
import { textareaClassName } from "../../aiAgent/aiAgentConstants";
import { useFlowEditorContext } from "./flowEditorContext";
import {
  createFlowId,
  FLOW_CONDITION_MAX_BUTTON_TITLE,
  FLOW_CONDITION_MAX_BUTTONS,
  flowNodeConfigs,
  WEEKDAY_LABELS,
} from "./flowNodeConfig";

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

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

type FlowNodePanelProps = {
  type: FlowNodeType;
  data: FlowNodeData;
  onChange: (data: FlowNodeData) => void;
  onDelete: () => void;
  onClose: () => void;
};

const Field: FC<{ label: string; hint?: string; children: ReactNode }> = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
    {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
  </div>
);

type OutputsEditorProps = {
  label: string;
  hint?: string;
  outputs: FlowOutput[];
  withDescription?: boolean;
  minItems: number;
  maxItems?: number;
  maxLength?: number;
  onChange: (outputs: FlowOutput[]) => void;
};

const OutputsEditor: FC<OutputsEditorProps> = ({ label, hint, outputs, withDescription, minItems, maxItems, maxLength, onChange }) => {
  const update = (index: number, changes: Partial<FlowOutput>) =>
    onChange(outputs.map((output, outputIndex) => (outputIndex === index ? { ...output, ...changes } : output)));

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-2">
        {outputs.map((output, index) => (
          <div key={output.id} className="space-y-1.5 rounded-md border p-2">
            <div className="flex items-center gap-1">
              <Input
                value={output.label}
                maxLength={maxLength}
                placeholder="Nome da saída"
                onChange={(e) => update(index, { label: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={outputs.length <= minItems}
                onClick={() => onChange(outputs.filter((_, outputIndex) => outputIndex !== index))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {withDescription && (
              <Input
                value={output.description ?? ""}
                placeholder="Quando a IA deve escolher esta saída"
                onChange={(e) => update(index, { description: e.target.value })}
              />
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={maxItems !== undefined && outputs.length >= maxItems}
          onClick={() => onChange([...outputs, { id: createFlowId(), label: "" }])}
        >
          <Plus className="h-4 w-4" />
          Adicionar saída
        </Button>
      </div>
    </Field>
  );
};

export const FlowNodePanel: FC<FlowNodePanelProps> = ({ type, data, onChange, onDelete, onClose }) => {
  const { serviceGroups, aiAgents, categories, flows, currentFlowId } = useFlowEditorContext();
  const config = flowNodeConfigs[type];
  const Icon = config.icon;

  const update = (changes: Partial<FlowNodeData>) => onChange({ ...data, ...changes });

  const setIntervalForWeekday = (weekday: number, interval: FlowBusinessHoursInterval | null) => {
    const otherIntervals = (data.intervals ?? []).filter((item) => item.weekday !== weekday);
    update({ intervals: interval ? [...otherIntervals, interval].sort((a, b) => a.weekday - b.weekday) : otherIntervals });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className={`h-4 w-4 ${config.colorClassName}`} />
        <h3 className="flex-1 truncate text-sm font-semibold">{config.label}</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-muted-foreground text-xs">{config.description}</p>

        {type === "start" && (
          <p className="text-sm">O fluxo começa aqui quando um contato abre um novo atendimento. Conecte a saída ao primeiro passo.</p>
        )}

        {type === "message" && (
          <Field label="Mensagem">
            <textarea
              value={data.text ?? ""}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Olá! Seja bem-vindo à ..."
              className={`${textareaClassName} min-h-32`}
            />
          </Field>
        )}

        {type === "end" && (
          <Field label="Mensagem de despedida" hint="Opcional. Enviada antes de finalizar o atendimento.">
            <textarea
              value={data.text ?? ""}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Obrigado pelo contato!"
              className={`${textareaClassName} min-h-24`}
            />
          </Field>
        )}

        {type === "condition" && (
          <>
            <Field
              label="Como interpretar a resposta"
              hint={
                data.mode === "ai"
                  ? "A IA classifica a resposta livre do contato. Exige a IA ativada no cliente; sem ela, só respostas iguais a uma opção são reconhecidas."
                  : "Envia botões de resposta rápida do WhatsApp (até 3)."
              }
            >
              <select
                className={selectClassName}
                value={data.mode ?? "buttons"}
                onChange={(e) => update({ mode: e.target.value as FlowNodeData["mode"] })}
              >
                <option value="buttons">Botões do WhatsApp</option>
                <option value="ai">IA interpreta a resposta</option>
              </select>
            </Field>

            <Field label="Pergunta enviada ao contato">
              <textarea
                value={data.question ?? ""}
                onChange={(e) => update({ question: e.target.value })}
                placeholder="Você já é nosso cliente?"
                className={`${textareaClassName} min-h-20`}
              />
            </Field>

            <OutputsEditor
              label="Opções"
              hint={
                data.mode === "buttons"
                  ? `Cada opção vira um botão (máx. ${FLOW_CONDITION_MAX_BUTTON_TITLE} caracteres). Respostas fora das opções seguem por "Outra resposta"; sem conexão nela, a pergunta é repetida.`
                  : 'Descreva cada opção para ajudar a IA. Respostas fora das opções seguem por "Outra resposta"; sem conexão nela, a pergunta é repetida.'
              }
              outputs={data.options ?? []}
              withDescription={data.mode === "ai"}
              minItems={2}
              maxItems={data.mode === "buttons" ? FLOW_CONDITION_MAX_BUTTONS : undefined}
              maxLength={data.mode === "buttons" ? FLOW_CONDITION_MAX_BUTTON_TITLE : undefined}
              onChange={(options) => update({ options })}
            />
          </>
        )}

        {type === "aiAgent" && (
          <>
            <Field label="Agente" hint={aiAgents.length === 0 ? "Cadastre um agente na aba Agentes de IA." : undefined}>
              <select className={selectClassName} value={data.aiAgentId ?? ""} onChange={(e) => update({ aiAgentId: e.target.value })}>
                <option value="">Selecione...</option>
                {aiAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Objetivo desta etapa"
              hint="Somado ao system prompt do agente. Diga o que precisa acontecer para a etapa terminar."
            >
              <textarea
                value={data.goal ?? ""}
                onChange={(e) => update({ goal: e.target.value })}
                placeholder="Coletar nome, CPF e convênio do contato."
                className={`${textareaClassName} min-h-20`}
              />
            </Field>

            <OutputsEditor
              label="Saídas"
              hint="A IA escolhe a saída ao concluir a etapa, com base na descrição."
              outputs={data.outputs ?? []}
              withDescription
              minItems={1}
              onChange={(outputs) => update({ outputs })}
            />
          </>
        )}

        {type === "serviceGroup" && (
          <>
            <Field label="Grupo" hint={serviceGroups.length === 0 ? "Cadastre um grupo na aba Grupos de atendimento." : undefined}>
              <select
                className={selectClassName}
                value={data.serviceGroupId ?? ""}
                onChange={(e) => update({ serviceGroupId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {serviceGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </Field>

            <OutputsEditor
              label="Saídas"
              hint='O atendente escolhe uma destas saídas no botão "Encaminhar" da conversa.'
              outputs={data.outputs ?? []}
              minItems={1}
              onChange={(outputs) => update({ outputs })}
            />
          </>
        )}

        {type === "flow" && (
          <Field
            label="Fluxo de destino"
            hint="O atendimento segue a partir do Início do fluxo escolhido, que precisa estar ativo. Fluxos que levariam de volta a este não são aceitos."
          >
            <select className={selectClassName} value={data.flowId ?? ""} onChange={(e) => update({ flowId: e.target.value })}>
              <option value="">Selecione...</option>
              {flows
                .filter((flow) => flow.id !== currentFlowId)
                .map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                    {flow.active ? "" : " (inativo)"}
                  </option>
                ))}
            </select>
          </Field>
        )}

        {type === "category" && (
          <Field
            label="Categorias"
            hint={
              categories.length === 0
                ? "Cadastre categorias na aba Categorias."
                : "As categorias são adicionadas ao contato; as que ele já tem são mantidas."
            }
          >
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
              {categories.map((category) => (
                <label key={category.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={data.categoryIds?.includes(category.id) ?? false}
                    onCheckedChange={(checked) =>
                      update({
                        categoryIds:
                          checked === true
                            ? [...(data.categoryIds ?? []), category.id]
                            : (data.categoryIds ?? []).filter((id) => id !== category.id),
                      })
                    }
                  />
                  <span className="truncate">{category.name}</span>
                </label>
              ))}
            </div>
          </Field>
        )}

        {type === "businessHours" && (
          <>
            <Field label="Fuso horário">
              <select className={selectClassName} value={data.timezone ?? ""} onChange={(e) => update({ timezone: e.target.value })}>
                {TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Horários" hint="O horário final não está incluso (08:00–18:00 atende até 17:59).">
              <div className="space-y-2">
                {WEEKDAY_LABELS.map((weekdayLabel, weekday) => {
                  const interval = data.intervals?.find((item) => item.weekday === weekday);

                  return (
                    <div key={weekday} className="flex items-center gap-2">
                      <label className="flex w-24 shrink-0 items-center gap-2 text-sm">
                        <Checkbox
                          checked={!!interval}
                          onCheckedChange={(checked) =>
                            setIntervalForWeekday(weekday, checked === true ? { weekday, start: "08:00", end: "18:00" } : null)
                          }
                        />
                        {weekdayLabel}
                      </label>
                      <Input
                        type="time"
                        disabled={!interval}
                        value={interval?.start ?? ""}
                        onChange={(e) => interval && setIntervalForWeekday(weekday, { ...interval, start: e.target.value })}
                      />
                      <Input
                        type="time"
                        disabled={!interval}
                        value={interval?.end ?? ""}
                        onChange={(e) => interval && setIntervalForWeekday(weekday, { ...interval, end: e.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
            </Field>
          </>
        )}
      </div>

      {type !== "start" && (
        <div className="border-t p-4">
          <Button variant="outline" className="text-destructive w-full" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Remover nó
          </Button>
        </div>
      )}
    </div>
  );
};
