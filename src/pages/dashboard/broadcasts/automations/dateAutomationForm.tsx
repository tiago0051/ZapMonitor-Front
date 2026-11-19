import { DisabledReason } from "@/components/disabled-reason";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { headerFileAccept, headerFileLabel, headerFileType, uploadTemplateHeaderFile } from "@/components/whatsappTemplate/templateUtils";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { contactService } from "@/services/api/contactService";
import { crmService } from "@/services/api/crmService";
import { dateAutomationService } from "@/services/api/dateAutomationService";
import { emailSequenceService } from "@/services/api/emailSequenceService";
import { templateService } from "@/services/api/templateService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { isWhatsappWeb } from "@/utils/whatsappConfiguration";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { defaultMapping, selectClassName } from "../audienceSources";
import type { VariableMapping } from "../broadcastUtils";
import { VariablesStep } from "../components/variablesStep";
import { dateAutomationActionLabel, dateAutomationSourceLabel, hourLabel } from "./dateAutomationUtils";

type DateAutomationFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automation: DateAutomation | null;
};

const asWhatsapp = (config: DateAutomationActionConfig | undefined) =>
  config && "templateId" in config ? config : { configurationId: "", templateId: "", mapping: {}, headerFileId: null };

/** Criar ou editar a automação por data: de qual data parte, quando roda e o que faz. */
export const DateAutomationForm: FC<DateAutomationFormProps> = ({ open, onOpenChange, automation }) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{automation ? "Editar automação" : "Nova automação por data"}</SheetTitle>
        <SheetDescription>Roda uma vez por dia no fuso da empresa, para quem a data pega, sem repetir no mesmo dia.</SheetDescription>
      </SheetHeader>
      {open && <FormBody key={automation?.id ?? "new"} automation={automation} onDone={() => onOpenChange(false)} />}
    </SheetContent>
  </Sheet>
);

const FormBody: FC<{ automation: DateAutomation | null; onDone: () => void }> = ({ automation, onDone }) => {
  const { client, canUseCrm } = useClientContext();
  const queryClient = useQueryClient();
  const initialWhatsapp = asWhatsapp(automation?.actionConfig);

  const [name, setName] = useState(automation?.name ?? "");
  const [dateSource, setDateSource] = useState<DateAutomationSource>(automation?.dateSource ?? "CONTACT_FIELD");
  const [fieldId, setFieldId] = useState(automation?.fieldId ?? "");
  const [direction, setDirection] = useState<"before" | "on" | "after">(
    !automation || automation.offsetDays === 0 ? "on" : automation.offsetDays < 0 ? "before" : "after",
  );
  const [days, setDays] = useState(String(Math.abs(automation?.offsetDays ?? 3) || 3));
  const [yearly, setYearly] = useState(automation?.yearly ?? true);
  const [onlyOpenDeals, setOnlyOpenDeals] = useState(automation?.onlyOpenDeals ?? true);
  const [sendHour, setSendHour] = useState(automation?.sendHour ?? 9);
  const [action, setAction] = useState<DateAutomationAction>(automation?.action ?? "WHATSAPP_TEMPLATE");
  const [configurationId, setConfigurationId] = useState(initialWhatsapp.configurationId);
  const [templateId, setTemplateId] = useState(initialWhatsapp.templateId);
  const [mapping, setMapping] = useState<Record<string, VariableMapping>>(initialWhatsapp.mapping as Record<string, VariableMapping>);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [sequenceId, setSequenceId] = useState(
    automation?.actionConfig && "sequenceId" in automation.actionConfig ? automation.actionConfig.sequenceId : "",
  );
  const [taskTitle, setTaskTitle] = useState(
    automation?.actionConfig && "title" in automation.actionConfig ? automation.actionConfig.title : "",
  );
  const [taskDueInDays, setTaskDueInDays] = useState(
    String(automation?.actionConfig && "dueInDays" in automation.actionConfig ? automation.actionConfig.dueInDays : 0),
  );

  const contactFieldsQuery = useQuery({
    queryKey: ["contacts", "fields", client.id],
    queryFn: () => contactService.findFields(client.id),
  });
  const crmFieldsQuery = useQuery({
    queryKey: ["crm", "fields", client.id],
    queryFn: () => crmService.findAllCrmFields({ params: { clientId: client.id } }),
    enabled: canUseCrm,
  });
  const dateFields = (
    dateSource === "DEAL_FIELD" ? (crmFieldsQuery.data ?? []).filter((field) => field.scope !== "CONTACT") : (contactFieldsQuery.data ?? [])
  ).filter((field) => field.active && field.type === "DATE");

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
    enabled: action === "WHATSAPP_TEMPLATE",
  });
  const configurations = (configurationsQuery.data?.items ?? []).filter((item) => item.enabled && !isWhatsappWeb(item));
  const templatesQuery = useQuery({
    queryKey: ["whatsappTemplates", client.id, configurationId],
    queryFn: () => templateService.findAll({ params: { clientId: client.id }, queries: { configurationId } }),
    enabled: action === "WHATSAPP_TEMPLATE" && !!configurationId,
  });
  const templates = (templatesQuery.data ?? []).filter((item) => item.synced && item.sendable);
  const template = templates.find((item) => item.id === templateId) ?? null;
  const fileType = headerFileType(template);

  const sequencesQuery = useQuery({
    queryKey: ["emailSequences", client.id],
    queryFn: () => emailSequenceService.findAll(client.id),
    enabled: action === "SEQUENCE",
  });
  const sequences = sequencesQuery.data ?? [];
  const sequence = sequences.find((item) => item.id === sequenceId);

  const offsetDays = direction === "on" ? 0 : (direction === "before" ? -1 : 1) * Number(days);
  const usesField = dateSource !== "CONTACT_CREATED";
  const error = (() => {
    if (!name.trim()) return "Dê um nome para a automação";
    if (usesField && !fieldId) return "Escolha o campo de data";
    if (direction !== "on" && !(Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 365))
      return "Os dias vão de 1 a 365";
    if (dateSource === "CONTACT_CREATED" && direction === "before") return "Para a data de cadastro, use dias depois";
    if (action === "WHATSAPP_TEMPLATE") {
      if (!configurationId || !template) return "Escolha o número e o modelo";
      if (fileType && !headerFile && !initialWhatsapp.headerFileId) return `Escolha o arquivo: ${headerFileLabel[fileType].toLowerCase()}`;
    }
    if (action === "SEQUENCE" && !sequenceId) return "Escolha a sequência";
    if (action === "TASK" && !taskTitle.trim()) return "Escreva o título da tarefa";
    return null;
  })();

  const save = useMutation({
    mutationFn: async () => {
      let actionConfig: Record<string, unknown>;
      if (action === "WHATSAPP_TEMPLATE") {
        const headerFileId =
          fileType && headerFile
            ? await uploadTemplateHeaderFile(client.id, configurationId, fileType, headerFile)
            : fileType
              ? initialWhatsapp.headerFileId
              : null;
        actionConfig = { configurationId, templateId, mapping, headerFileId };
      } else if (action === "SEQUENCE") actionConfig = { sequenceId };
      else actionConfig = { title: taskTitle.trim(), dueInDays: Number(taskDueInDays) || 0 };

      const body = {
        name: name.trim(),
        dateSource,
        fieldId: usesField ? fieldId : null,
        offsetDays,
        yearly: usesField && yearly,
        onlyOpenDeals,
        sendHour,
        action,
        actionConfig: actionConfig as DateAutomationActionConfig,
      };
      return automation ? dateAutomationService.update(client.id, automation.id, body) : dateAutomationService.create(client.id, body);
    },
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dateAutomations", client.id] });
      toast.success(automation ? "Automação salva" : "Automação criada", { description: "Ela roda sozinha todo dia na hora escolhida." });
      onDone();
    },
  });

  return (
    <div className="grid gap-4 px-4 pb-4">
      <div className="grid gap-1.5">
        <Label htmlFor="date-automation-name">Nome</Label>
        <Input
          id="date-automation-name"
          value={name}
          maxLength={120}
          placeholder="Ex.: Parabéns no aniversário"
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="grid gap-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Quando</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="date-automation-source" className="text-xs">
              A partir de
            </Label>
            <select
              id="date-automation-source"
              className={selectClassName}
              value={dateSource}
              onChange={(event) => {
                setDateSource(event.target.value as DateAutomationSource);
                setFieldId("");
              }}
            >
              {(Object.keys(dateAutomationSourceLabel) as DateAutomationSource[])
                .filter((source) => canUseCrm || source !== "DEAL_FIELD")
                .map((source) => (
                  <option key={source} value={source}>
                    {dateAutomationSourceLabel[source]}
                  </option>
                ))}
            </select>
          </div>
          {usesField && (
            <div className="grid gap-1.5">
              <Label htmlFor="date-automation-field" className="text-xs">
                Campo
              </Label>
              <select
                id="date-automation-field"
                className={selectClassName}
                value={fieldId}
                onChange={(event) => setFieldId(event.target.value)}
              >
                <option value="">{dateFields.length ? "Selecione" : "Nenhum campo do tipo data"}</option>
                {dateFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {direction !== "on" && (
            <div className="grid gap-1.5">
              <Label htmlFor="date-automation-days" className="text-xs">
                Dias
              </Label>
              <Input
                id="date-automation-days"
                type="number"
                min={1}
                max={365}
                className="w-24"
                value={days}
                onChange={(event) => setDays(event.target.value)}
              />
            </div>
          )}
          <select
            aria-label="Antes, no dia ou depois"
            className={`${selectClassName} w-auto`}
            value={direction}
            onChange={(event) => setDirection(event.target.value as typeof direction)}
          >
            <option value="before">antes da data</option>
            <option value="on">no próprio dia</option>
            <option value="after">depois da data</option>
          </select>
          <div className="grid gap-1.5">
            <Label htmlFor="date-automation-hour" className="text-xs">
              A partir de
            </Label>
            <select
              id="date-automation-hour"
              className={`${selectClassName} w-auto`}
              value={sendHour}
              onChange={(event) => setSendHour(Number(event.target.value))}
            >
              {Array.from({ length: 16 }, (_, index) => index + 6).map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {usesField && (
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={yearly} onCheckedChange={(checked) => setYearly(checked === true)} />
            <span>
              Todo ano, no mesmo dia e mês
              <span className="text-muted-foreground block text-xs">
                Para aniversário e datas que se repetem; sem isso, roda só na data exata.
              </span>
            </span>
          </label>
        )}
        {dateSource === "DEAL_FIELD" && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyOpenDeals} onCheckedChange={(checked) => setOnlyOpenDeals(checked === true)} />
            Só negócios em aberto
          </label>
        )}
      </div>

      <div className="grid gap-3 rounded-lg border p-3">
        <div className="grid gap-1.5">
          <Label htmlFor="date-automation-action" className="text-sm font-medium">
            O que fazer
          </Label>
          <select
            id="date-automation-action"
            className={selectClassName}
            value={action}
            onChange={(event) => setAction(event.target.value as DateAutomationAction)}
          >
            {(Object.keys(dateAutomationActionLabel) as DateAutomationAction[])
              .filter((item) => canUseCrm || item !== "TASK")
              .map((item) => (
                <option key={item} value={item}>
                  {dateAutomationActionLabel[item]}
                </option>
              ))}
          </select>
        </div>

        {action === "WHATSAPP_TEMPLATE" && (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="date-automation-configuration" className="text-xs">
                  Número
                </Label>
                <select
                  id="date-automation-configuration"
                  className={selectClassName}
                  value={configurationId}
                  onChange={(event) => {
                    setConfigurationId(event.target.value);
                    setTemplateId("");
                  }}
                >
                  <option value="">Selecione</option>
                  {configurations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.phoneNumber}
                    </option>
                  ))}
                </select>
              </div>
              {configurationId && (
                <div className="grid gap-1.5">
                  <Label htmlFor="date-automation-template" className="text-xs">
                    Modelo
                  </Label>
                  <select
                    id="date-automation-template"
                    className={selectClassName}
                    value={templateId}
                    onChange={(event) => {
                      const selected = templates.find((item) => item.id === event.target.value);
                      setTemplateId(event.target.value);
                      setMapping(defaultMapping(selected?.parameters ?? []));
                      setHeaderFile(null);
                    }}
                  >
                    <option value="">{templatesQuery.isLoading ? "Carregando..." : "Selecione"}</option>
                    {templates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.language})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {fileType && (
              <div className="grid gap-1.5">
                <Label htmlFor="date-automation-header" className="text-xs">
                  {headerFileLabel[fileType]}
                  {initialWhatsapp.headerFileId && !headerFile && " (já enviado; escolha outro para trocar)"}
                </Label>
                <Input
                  id="date-automation-header"
                  type="file"
                  accept={headerFileAccept[fileType]}
                  onChange={(event) => setHeaderFile(event.target.files?.[0] ?? null)}
                />
              </div>
            )}
            {template && (
              <VariablesStep
                parameters={template.parameters}
                mapping={mapping}
                onChange={setMapping}
                csvHeaders={[]}
                crmFields={[...(crmFieldsQuery.data ?? []), ...(contactFieldsQuery.data ?? [])].filter(
                  (field, index, list) => list.findIndex((item) => item.id === field.id) === index,
                )}
                hasCrmRows
              />
            )}
            <p className="text-muted-foreground text-xs">
              Vira um disparo por dia, com quem a data pegou: descadastrados ficam de fora em modelo de marketing, e o resultado aparece na
              aba WhatsApp.
            </p>
          </div>
        )}

        {action === "SEQUENCE" && (
          <div className="grid gap-1.5">
            <Label htmlFor="date-automation-sequence" className="text-xs">
              Sequência
            </Label>
            <select
              id="date-automation-sequence"
              className={selectClassName}
              value={sequenceId}
              onChange={(event) => setSequenceId(event.target.value)}
            >
              <option value="">{sequences.length ? "Selecione" : "Nenhuma sequência"}</option>
              {sequences.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.active ? "" : " (desligada)"}
                </option>
              ))}
            </select>
            {sequence && !sequence.active && (
              <p className="text-xs text-amber-700 dark:text-amber-400">A sequência está desligada: ligue-a para as pessoas entrarem.</p>
            )}
          </div>
        )}

        {action === "TASK" && (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid gap-1.5">
              <Label htmlFor="date-automation-task" className="text-xs">
                Título da tarefa
              </Label>
              <Input
                id="date-automation-task"
                value={taskTitle}
                maxLength={191}
                placeholder="Ex.: Ligar para renovar o contrato"
                onChange={(event) => setTaskTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="date-automation-task-due" className="text-xs">
                Prazo (dias)
              </Label>
              <Input
                id="date-automation-task-due"
                type="number"
                min={0}
                max={90}
                className="w-24"
                value={taskDueInDays}
                onChange={(event) => setTaskDueInDays(event.target.value)}
              />
            </div>
            <p className="text-muted-foreground text-xs sm:col-span-2">
              A tarefa vai para o negócio da data (ou o negócio aberto mais recente da pessoa), com o dono do negócio como responsável.
            </p>
          </div>
        )}
      </div>

      <SheetFooter className="px-0">
        {error && <DisabledReason>{error}</DisabledReason>}
        <Button disabled={!!error || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Salvando..." : automation ? "Salvar" : "Criar automação"}
        </Button>
      </SheetFooter>
    </div>
  );
};
