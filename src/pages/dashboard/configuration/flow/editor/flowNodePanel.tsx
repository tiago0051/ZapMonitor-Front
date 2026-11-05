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
  QUEUE_MESSAGE_VARIABLES,
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

const CATEGORY_HINTS: Partial<Record<FlowNodeType, string>> = {
  category: "As categorias são adicionadas ao contato; as que ele já tem são mantidas.",
  removeCategory: "As categorias são removidas do contato; as demais são mantidas.",
  replaceCategories: "As categorias atuais do contato são trocadas pelas selecionadas.",
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

const toggleId = (ids: string[], id: string, checked: boolean) => (checked ? [...ids, id] : ids.filter((item) => item !== id));

// Etapas e campos que o agente pode mudar no negócio do contato enquanto conversa
const AgentCrmSettings: FC<{
  data: FlowNodeData;
  pipelines: Pipeline[];
  crmFields: CrmField[];
  update: (changes: Partial<FlowNodeData>) => void;
}> = ({ data, pipelines, crmFields, update }) => {
  const crm = data.crm ?? null;
  const pipeline = pipelines.find((item) => item.id === crm?.pipelineId);

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={!!crm}
          onCheckedChange={(checked) =>
            update({ crm: checked === true ? { pipelineId: pipelines[0].id, stageIds: [], fieldIds: [] } : null })
          }
        />
        Atualizar o CRM durante a conversa
      </label>
      <p className="text-muted-foreground text-xs">
        O agente move o negócio do contato para as etapas liberadas e preenche os campos liberados com o que ouvir na conversa. Sem negócio
        aberto no funil, ele cria um.
      </p>

      {crm && (
        <>
          <Field label="Funil">
            <select
              className={selectClassName}
              value={crm.pipelineId}
              onChange={(e) => update({ crm: { pipelineId: e.target.value, stageIds: [], fieldIds: crm.fieldIds } })}
            >
              {pipelines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Etapas que o agente pode usar">
            <div className="space-y-1.5">
              {pipeline?.stages.map((stage) => (
                <label key={stage.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={crm.stageIds.includes(stage.id)}
                    onCheckedChange={(checked) => update({ crm: { ...crm, stageIds: toggleId(crm.stageIds, stage.id, checked === true) } })}
                  />
                  {stage.name}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label="Campos que o agente pode preencher"
            hint={crmFields.length === 0 ? "Cadastre campos na aba Campos do negócio." : undefined}
          >
            <div className="space-y-1.5">
              {crmFields.map((field) => (
                <label key={field.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={crm.fieldIds.includes(field.id)}
                    onCheckedChange={(checked) => update({ crm: { ...crm, fieldIds: toggleId(crm.fieldIds, field.id, checked === true) } })}
                  />
                  {field.name}
                </label>
              ))}
            </div>
          </Field>
        </>
      )}
    </div>
  );
};

export const FlowNodePanel: FC<FlowNodePanelProps> = ({ type, data, onChange, onDelete, onClose }) => {
  const { serviceGroups, aiAgents, categories, flows, pipelines, crmFields, currentFlowId } = useFlowEditorContext();
  const isQueueFlow = flows.find((flow) => flow.id === currentFlowId)?.kind === "QUEUE";
  const queueFlows = flows.filter((flow) => flow.kind === "QUEUE");
  const queueTextHint = isQueueFlow ? `Use ${QUEUE_MESSAGE_VARIABLES}. Só é enviada dentro da janela de 24h do WhatsApp.` : undefined;
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

        {type === "queueTimer" && (
          <>
            <Field label="A cada (minutos)" hint="Conta a partir de quando o contato entrou na fila.">
              <Input
                type="number"
                min={1}
                max={1440}
                value={data.everyMinutes ?? ""}
                onChange={(e) => update({ everyMinutes: e.target.valueAsNumber })}
              />
            </Field>
            <Field label="Repetir no máximo" hint="Depois disso o fluxo para; o contato continua na fila.">
              <Input
                type="number"
                min={1}
                max={50}
                value={data.maxRepetitions ?? ""}
                onChange={(e) => update({ maxRepetitions: e.target.valueAsNumber })}
              />
            </Field>
            <p className="text-muted-foreground text-xs">
              Para quando um atendente assume, o atendimento termina ou o contato sai da fila.
            </p>
          </>
        )}

        {type === "queueMessage" && (
          <Field
            label="Intervalo mínimo entre respostas (minutos)"
            hint="Quem manda várias mensagens seguidas recebe uma resposta só. Use 0 para responder toda mensagem."
          >
            <Input
              type="number"
              min={0}
              max={1440}
              value={data.cooldownMinutes ?? ""}
              onChange={(e) => update({ cooldownMinutes: e.target.valueAsNumber })}
            />
          </Field>
        )}

        {type === "message" && (
          <Field label="Mensagem" hint={queueTextHint}>
            <textarea
              value={data.text ?? ""}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Olá! Seja bem-vindo à ..."
              className={`${textareaClassName} min-h-32`}
            />
          </Field>
        )}

        {type === "end" && (
          <Field
            label="Mensagem de despedida"
            hint={`Opcional. Enviada antes de finalizar o atendimento.${queueTextHint ? ` ${queueTextHint}` : ""}`}
          >
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

            {pipelines.length > 0 && <AgentCrmSettings data={data} pipelines={pipelines} crmFields={crmFields} update={update} />}
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

            <Field label="Fluxo de fila" hint="Age enquanto o contato espera: mensagens a cada período e resposta a quem escreve.">
              <select
                className={selectClassName}
                value={data.queueFlowId ?? ""}
                onChange={(e) => update({ queueFlowId: e.target.value || null })}
              >
                <option value="">O padrão do grupo</option>
                {queueFlows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                    {flow.active ? "" : " (inativo)"}
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

        {type === "crmAnalysis" && (
          <>
            <Field
              label="Funil"
              hint="A IA lê a conversa e dá a nota, a etapa sugerida e o próximo passo de cada negócio aberto do contato. Roda em segundo plano: o fluxo segue na hora. Usa a cota de IA."
            >
              <select className={selectClassName} value={data.pipelineId ?? ""} onChange={(e) => update({ pipelineId: e.target.value })}>
                <option value="">Todos os funis</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {type === "crm" && (
          <>
            <Field label="Funil" hint={pipelines.length === 0 ? "Cadastre um funil ativo na aba Funis." : undefined}>
              <select
                className={selectClassName}
                value={data.pipelineId ?? ""}
                onChange={(e) => update({ pipelineId: e.target.value, stageId: "" })}
              >
                <option value="">Selecione...</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Etapa"
              hint="Se o contato já tem um negócio aberto neste funil, ele é movido para a etapa; senão, um negócio novo é criado nela."
            >
              <select
                className={selectClassName}
                value={data.stageId ?? ""}
                disabled={!data.pipelineId}
                onChange={(e) => update({ stageId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {pipelines
                  .find((pipeline) => pipeline.id === data.pipelineId)
                  ?.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field
              label="Grupo do negócio"
              hint="Define quem vê o negócio. Sem grupo escolhido, o negócio novo fica com o grupo atual do contato e o existente mantém o seu."
            >
              <select
                className={selectClassName}
                value={data.serviceGroupId ?? ""}
                onChange={(e) => update({ serviceGroupId: e.target.value })}
              >
                <option value="">Grupo atual do contato</option>
                {serviceGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </Field>
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
                .filter((flow) => flow.id !== currentFlowId && flow.kind !== "QUEUE")
                .map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                    {flow.active ? "" : " (inativo)"}
                  </option>
                ))}
            </select>
          </Field>
        )}

        {(type === "category" || type === "removeCategory" || type === "replaceCategories") && (
          <Field label="Categorias" hint={categories.length === 0 ? "Cadastre categorias na aba Categorias." : CATEGORY_HINTS[type]}>
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
