import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { Copy, Plus, Trash2, X } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { Link } from "react-router";
import { textareaClassName } from "../../aiAgent/aiAgentConstants";
import { DialogSaveAiAgent } from "../../aiAgent/components/dialogSaveAiAgent";
import { DialogSaveServiceGroup } from "../../serviceGroup/components/dialogSaveServiceGroup";
import { useFlowEditorContext } from "./flowEditorContext";
import { FlowMessageMediaField, FlowVariableTextarea } from "./flowMessageExtras";
import {
  createFlowId,
  FLOW_ASK_TARGET_LABELS,
  FLOW_ASK_VALIDATION_LABELS,
  FLOW_WAIT_MAX_MINUTES,
  FLOW_WAIT_MIN_MINUTES,
  FLOW_CONDITION_MAX_BUTTON_TITLE,
  FLOW_CONDITION_MAX_BUTTONS,
  DEFAULT_CALL_PERMISSION_TEXT,
  FLOW_CALL_PERMISSION_MAX_TEXT,
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

// Valor especial dos selects de agente e grupo: abre o cadastro sem sair do editor
const CREATE_NEW_OPTION = "__create__";

// Unidades do nó Aguardar; o valor salvo é sempre em minutos
const WAIT_UNITS = [
  { id: "minutes", label: "minutos", factor: 1 },
  { id: "hours", label: "horas", factor: 60 },
  { id: "days", label: "dias", factor: 1440 },
] as const;
type WaitUnit = (typeof WAIT_UNITS)[number]["id"];

const pickWaitUnit = (minutes: number | undefined): WaitUnit =>
  minutes && minutes % 1440 === 0 ? "days" : minutes && minutes % 60 === 0 ? "hours" : "minutes";

const WaitSettings: FC<{ minutes: number | undefined; onChange: (minutes: number) => void }> = ({ minutes, onChange }) => {
  const [unit, setUnit] = useState<WaitUnit>(() => pickWaitUnit(minutes));
  const factor = WAIT_UNITS.find((item) => item.id === unit)!.factor;
  const amount = minutes ? Math.round((minutes / factor) * 100) / 100 : "";

  return (
    <Field
      label="Esperar"
      hint="De 1 minuto a 7 dias. Se o contato escrever nesse meio tempo, o fluxo continua esperando; se o atendimento for encerrado ou assumido por alguém, a espera é cancelada."
    >
      <div className="flex gap-2">
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => onChange(Math.round(e.target.valueAsNumber * factor))}
          className="flex-1"
        />
        <select
          className={`${selectClassName} w-28`}
          value={unit}
          aria-label="Unidade de tempo"
          onChange={(e) => {
            const nextUnit = e.target.value as WaitUnit;
            const nextFactor = WAIT_UNITS.find((item) => item.id === nextUnit)!.factor;
            setUnit(nextUnit);
            // Mantém o número digitado e troca só a unidade (2 horas → 2 dias)
            if (minutes) onChange(Math.round((minutes / factor) * nextFactor));
          }}
        >
          {WAIT_UNITS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {minutes !== undefined && (Number.isNaN(minutes) || minutes < FLOW_WAIT_MIN_MINUTES || minutes > FLOW_WAIT_MAX_MINUTES) && (
        <p className="text-destructive text-xs">A espera precisa ser de 1 minuto a 7 dias.</p>
      )}
    </Field>
  );
};

type FlowNodePanelProps = {
  clientId: string;
  type: FlowNodeType;
  data: FlowNodeData;
  onChange: (data: FlowNodeData) => void;
  onDelete: () => void;
  // Ausente nos nós que não podem ser copiados (ex.: Início)
  onDuplicate?: () => void;
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
                aria-label="Remover saída"
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

export const FlowNodePanel: FC<FlowNodePanelProps> = ({ clientId, type, data, onChange, onDelete, onDuplicate, onClose }) => {
  const { serviceGroups, aiAgents, categories, flows, pipelines, crmFields, contactFields, emailOptions, currentFlowId } =
    useFlowEditorContext();
  const { can, access } = useClientContext();
  const canCreateAgent = can("aiAgents.manage");
  const canCreateGroup = can("serviceGroups.manage");
  const [creating, setCreating] = useState<"aiAgent" | "serviceGroup" | null>(null);
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
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Fechar painel" onClick={onClose}>
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
          <>
            <Field label="Mensagem" hint={queueTextHint ?? (data.media ? "Opcional com anexo: vai antes do arquivo." : undefined)}>
              <FlowVariableTextarea
                value={data.text ?? ""}
                onChange={(text) => update({ text })}
                placeholder="Olá, {{primeiro_nome}}! Seja bem-vindo à ..."
                className="min-h-32"
              />
            </Field>
            <Field label="Anexo" hint="Opcional. Imagem, PDF, áudio ou vídeo enviado logo depois do texto.">
              <FlowMessageMediaField clientId={clientId} media={data.media} onChange={(media) => update({ media })} />
            </Field>
          </>
        )}

        {type === "wait" && <WaitSettings minutes={data.minutes} onChange={(minutes) => update({ minutes })} />}

        {type === "askField" && (
          <>
            <Field label="Pergunta enviada ao contato">
              <FlowVariableTextarea
                value={data.question ?? ""}
                onChange={(question) => update({ question })}
                placeholder="Qual é a sua data de nascimento?"
                className="min-h-20"
              />
            </Field>
            <Field label="Onde salvar a resposta">
              <select
                className={selectClassName}
                value={data.target ?? "contactField"}
                onChange={(e) => {
                  const target = e.target.value as FlowAskTarget;
                  // E-mail da ficha só aceita resposta do tipo e-mail
                  update({ target, fieldId: null, ...(target === "email" ? { validation: "email" as const } : {}) });
                }}
              >
                {(Object.keys(FLOW_ASK_TARGET_LABELS) as FlowAskTarget[])
                  .filter((target) => target !== "dealField" || access.crmEnabled)
                  .map((target) => (
                    <option key={target} value={target}>
                      {FLOW_ASK_TARGET_LABELS[target]}
                    </option>
                  ))}
              </select>
            </Field>
            {(data.target === "contactField" || data.target === "dealField") && (
              <Field
                label="Campo"
                hint={
                  (data.target === "contactField" ? contactFields : crmFields).length === 0
                    ? "Cadastre campos em Configurações › Campos personalizados."
                    : data.target === "dealField"
                      ? "Vai para o negócio aberto mais recente do contato; sem negócio aberto, a resposta não é salva e o fluxo segue."
                      : undefined
                }
              >
                <select
                  className={selectClassName}
                  value={data.fieldId ?? ""}
                  onChange={(e) => update({ fieldId: e.target.value || null })}
                >
                  <option value="">Selecione...</option>
                  {(data.target === "contactField" ? contactFields : crmFields).map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field
              label="Tipo de resposta"
              hint='Respostas fora do tipo seguem por "Resposta inválida"; sem ligação nela, o contato recebe uma explicação e a pergunta de novo.'
            >
              <select
                className={selectClassName}
                value={data.validation ?? "text"}
                disabled={data.target === "email"}
                onChange={(e) => update({ validation: e.target.value as FlowAskValidation })}
              >
                {(Object.keys(FLOW_ASK_VALIDATION_LABELS) as FlowAskValidation[]).map((validation) => (
                  <option key={validation} value={validation}>
                    {FLOW_ASK_VALIDATION_LABELS[validation]}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {type === "callPermission" && (
          <Field
            label="Texto do pedido"
            hint='Opcional. O contato recebe o pedido da Meta com os botões para autorizar ou não as ligações, e o fluxo espera a resposta. Se ele já autorizou, segue direto por "Autorizou". Número por QR code, sem as ligações ligadas ou com o limite de pedidos da Meta atingido segue por "Não deu para pedir". Se o contato escrever em vez de tocar no botão, segue por "Outra resposta" (se ligada) ou continua esperando.'
          >
            <textarea
              value={data.text ?? ""}
              maxLength={FLOW_CALL_PERMISSION_MAX_TEXT}
              onChange={(e) => update({ text: e.target.value })}
              placeholder={DEFAULT_CALL_PERMISSION_TEXT}
              className={`${textareaClassName} min-h-24`}
            />
          </Field>
        )}

        {type === "end" && (
          <Field
            label="Mensagem de despedida"
            hint={`Opcional. Enviada antes de finalizar o atendimento.${queueTextHint ? ` ${queueTextHint}` : ""}`}
          >
            <FlowVariableTextarea
              value={data.text ?? ""}
              onChange={(text) => update({ text })}
              placeholder="Obrigado pelo contato, {{primeiro_nome}}!"
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
            <Field
              label="Agente"
              hint={aiAgents.length === 0 && !canCreateAgent ? "Peça a quem cuida dos agentes de IA para cadastrar um." : undefined}
            >
              <select
                className={selectClassName}
                value={data.aiAgentId ?? ""}
                onChange={(e) => (e.target.value === CREATE_NEW_OPTION ? setCreating("aiAgent") : update({ aiAgentId: e.target.value }))}
              >
                <option value="">Selecione...</option>
                {aiAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
                {canCreateAgent && <option value={CREATE_NEW_OPTION}>+ Criar novo agente…</option>}
              </select>
            </Field>

            {isQueueFlow && (
              <p className="rounded-md bg-sky-50 p-2 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                Na fila o agente responde o contato sem tirá-lo da fila: o atendimento continua esperando um atendente. Ligado ao "Cliente
                mandou mensagem", use 0 no intervalo entre respostas para o agente responder toda mensagem.
              </p>
            )}

            <Field
              label={isQueueFlow ? "O que o agente deve fazer na fila" : "Objetivo desta etapa"}
              hint={
                isQueueFlow
                  ? "Somado ao system prompt do agente. Ex.: tirar dúvidas enquanto o contato espera e avisar que um atendente já vai responder."
                  : "Somado ao system prompt do agente. Diga o que precisa acontecer para a etapa terminar."
              }
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
              hint={
                isQueueFlow
                  ? "Opcional. Quando o agente concluir por uma saída, o fluxo de fila segue por ela (ex.: mandar uma mensagem ou encerrar); sem saída, o contato só continua esperando."
                  : "A IA escolhe a saída ao concluir a etapa, com base na descrição."
              }
              outputs={data.outputs ?? []}
              withDescription
              minItems={isQueueFlow ? 0 : 1}
              onChange={(outputs) => update({ outputs })}
            />

            {pipelines.length > 0 && !isQueueFlow && (
              <AgentCrmSettings data={data} pipelines={pipelines} crmFields={crmFields} update={update} />
            )}
          </>
        )}

        {type === "serviceGroup" && (
          <>
            <Field
              label="Grupo"
              hint={
                serviceGroups.length === 0 && !canCreateGroup ? "Peça a quem cuida dos grupos de atendimento para cadastrar um." : undefined
              }
            >
              <select
                className={selectClassName}
                value={data.serviceGroupId ?? ""}
                onChange={(e) =>
                  e.target.value === CREATE_NEW_OPTION ? setCreating("serviceGroup") : update({ serviceGroupId: e.target.value })
                }
              >
                <option value="">Selecione...</option>
                {serviceGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
                {canCreateGroup && <option value={CREATE_NEW_OPTION}>+ Criar novo grupo…</option>}
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

        {type === "email" && (
          <>
            <Field
              label="Remetente"
              hint={emailOptions.senders.length === 0 ? "Verifique um domínio em Configurações › Envio de e-mail." : undefined}
            >
              <select className={selectClassName} value={data.senderId ?? ""} onChange={(e) => update({ senderId: e.target.value })}>
                <option value="">Selecione...</option>
                {emailOptions.senders.map((sender) => (
                  <option key={sender.id} value={sender.id}>
                    {sender.fromName} &lt;{sender.fromEmail}&gt;
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Modelo de e-mail"
              hint='Vai para o e-mail principal da ficha do contato, com as variáveis da ficha e do negócio aberto mais recente. Sem e-mail na ficha, descadastrado ou com o remetente fora do ar, o fluxo segue por "Não enviado". O modelo é lido na hora do envio: editar o modelo muda os próximos envios.'
            >
              <select className={selectClassName} value={data.templateId ?? ""} onChange={(e) => update({ templateId: e.target.value })}>
                <option value="">{emailOptions.templates.length ? "Selecione..." : "Crie um modelo em E-mails › Modelos"}</option>
                {emailOptions.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {type === "emailSequence" && (
          <Field
            label="Sequência"
            hint='A ficha do contato entra na sequência e o fluxo segue por "Na sequência" (também quando ela já estava). Sem e-mail na ficha, descadastrado ou com a sequência desligada, segue por "Não entrou". Monte as sequências em Campanhas › Sequências de e-mail.'
          >
            <select className={selectClassName} value={data.sequenceId ?? ""} onChange={(e) => update({ sequenceId: e.target.value })}>
              <option value="">{emailOptions.sequences?.length ? "Selecione..." : "Nenhuma sequência criada"}</option>
              {(emailOptions.sequences ?? []).map((sequence) => (
                <option key={sequence.id} value={sequence.id}>
                  {sequence.name}
                  {sequence.active ? "" : " (desligada)"}
                </option>
              ))}
            </select>
          </Field>
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
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={!!data.useCompanyHours}
              onCheckedChange={(checked) => update({ useCompanyHours: checked === true })}
            />
            <span className="space-y-1">
              <span className="block font-medium">Usar o horário da empresa</span>
              <span className="text-muted-foreground block text-xs">
                Um só horário para todos os fluxos, com feriados e datas fechadas.{" "}
                {can("flows.manage") && (
                  <Link to="../..?tab=companyHours" relative="path" className="text-primary underline">
                    Ver ou mudar o horário da empresa
                  </Link>
                )}
              </span>
            </span>
          </label>
        )}

        {type === "businessHours" && !data.useCompanyHours && (
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
        <div className="flex gap-2 border-t p-4">
          {onDuplicate && (
            <Button variant="outline" className="flex-1" onClick={onDuplicate}>
              <Copy className="h-4 w-4" />
              Duplicar
            </Button>
          )}
          <Button variant="outline" className="text-destructive flex-1" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Remover
          </Button>
        </div>
      )}

      {/* Cadastro sem sair do editor: o criado já fica escolhido no nó */}
      {canCreateAgent && (
        <DialogSaveAiAgent
          clientId={clientId}
          open={creating === "aiAgent"}
          onOpenChange={(open) => setCreating(open ? "aiAgent" : null)}
          onCreated={(agent) => update({ aiAgentId: agent.id })}
        />
      )}
      {canCreateGroup && (
        <DialogSaveServiceGroup
          clientId={clientId}
          serviceGroups={serviceGroups}
          open={creating === "serviceGroup"}
          onOpenChange={(open) => setCreating(open ? "serviceGroup" : null)}
          onCreated={(group) => update({ serviceGroupId: group.id })}
        />
      )}
    </div>
  );
};
