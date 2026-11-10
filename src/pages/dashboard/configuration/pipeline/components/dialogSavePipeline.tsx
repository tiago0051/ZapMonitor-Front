import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { crmSelectClassName, stageColorOptions } from "@/pages/dashboard/crm/crmUtils";
import { flowService } from "@/services/api/flowService";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { conversionEventLabel } from "@/pages/dashboard/crm/crmUtils";

type DialogSavePipelineProps = {
  clientId: string;
  pipeline?: Pipeline;
};

// A chave identifica a linha no formulário; o id só existe para etapas já salvas
type StageDraft = SavePipelineStageRequestBody & { key: string };

const MAX_STAGES = 20;

const newKey = () => crypto.randomUUID();

const buildDefaultStages = (): StageDraft[] => [
  { key: newKey(), name: "Novo lead", color: stageColorOptions[0], type: "OPEN" },
  { key: newKey(), name: "Em negociação", color: stageColorOptions[1], type: "OPEN" },
  { key: newKey(), name: "Proposta enviada", color: stageColorOptions[2], type: "OPEN" },
  { key: newKey(), name: "Ganho", color: "#22c55e", type: "WON", conversionEvent: "PURCHASE" },
  { key: newKey(), name: "Perdido", color: "#ef4444", type: "LOST" },
];

type StageRowProps = {
  stage: StageDraft;
  flows: Flow[];
  fields: CrmField[];
  onChange: (stage: StageDraft) => void;
  disabled: boolean;
  // Só aparece para quem tem o módulo de anúncios
  showConversionEvent: boolean;
  children?: React.ReactNode;
};

// Eventos que cabem em cada tipo de etapa; perda não tem evento padrão na Meta
const conversionEventsByStageType: Record<PipelineStageType, ConversionEventName[]> = {
  OPEN: ["LEAD_SUBMITTED", "QUALIFIED_LEAD"],
  WON: ["PURCHASE"],
  LOST: [],
};

const toggleId = (ids: string[], id: string, checked: boolean) => (checked ? [...ids, id] : ids.filter((item) => item !== id));

const StageRow: FC<StageRowProps> = ({ stage, flows, fields, onChange, disabled, showConversionEvent, children }) => (
  <div className="bg-muted/30 grid gap-2 rounded-lg border p-2">
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={`Cor da etapa ${stage.name}`}
        value={stage.color}
        disabled={disabled}
        onChange={(event) => onChange({ ...stage, color: event.target.value })}
        className="h-9 w-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
      />
      <Input
        aria-label="Nome da etapa"
        value={stage.name}
        maxLength={60}
        disabled={disabled}
        onChange={(event) => onChange({ ...stage, name: event.target.value })}
      />
      {children}
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:pl-11">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-muted-foreground shrink-0">Ao entrar, rodar</span>
        <select
          aria-label={`Fluxo da etapa ${stage.name}`}
          value={stage.entryFlowId ?? ""}
          disabled={disabled}
          onChange={(event) => onChange({ ...stage, entryFlowId: event.target.value || null })}
          className={`${crmSelectClassName} h-8 min-w-0 text-xs`}
        >
          <option value="">Nenhum fluxo</option>
          {flows.map((flow) => (
            <option key={flow.id} value={flow.id}>
              {flow.name}
              {flow.active ? "" : " (inativo)"}
            </option>
          ))}
        </select>
      </label>
      {fields.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-normal" disabled={disabled}>
              {(stage.requiredFieldIds ?? []).length === 0
                ? "Sem campos obrigatórios"
                : `Exige ${(stage.requiredFieldIds ?? []).length} campo(s)`}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-2">
            <p className="text-muted-foreground text-xs">Para mover um negócio para {stage.name || "esta etapa"}, preencha:</p>
            {fields.map((field) => (
              <label key={field.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={(stage.requiredFieldIds ?? []).includes(field.id)}
                  onCheckedChange={(checked) =>
                    onChange({ ...stage, requiredFieldIds: toggleId(stage.requiredFieldIds ?? [], field.id, checked === true) })
                  }
                />
                {field.name}
              </label>
            ))}
          </PopoverContent>
        </Popover>
      )}
      {showConversionEvent && conversionEventsByStageType[stage.type].length > 0 && (
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground shrink-0">Evento na Meta</span>
          <select
            aria-label={`Evento na Meta da etapa ${stage.name}`}
            value={stage.conversionEvent ?? ""}
            disabled={disabled}
            onChange={(event) => onChange({ ...stage, conversionEvent: (event.target.value || null) as ConversionEventName | null })}
            className={`${crmSelectClassName} h-8 text-xs`}
          >
            <option value="">Nenhum</option>
            {conversionEventsByStageType[stage.type].map((event) => (
              <option key={event} value={event}>
                {conversionEventLabel[event]}
              </option>
            ))}
          </select>
        </label>
      )}
      {stage.type === "OPEN" && (
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Esfria após</span>
          <Input
            type="number"
            min={1}
            max={365}
            aria-label={`Dias para a etapa ${stage.name} esfriar`}
            value={stage.staleAfterDays ?? ""}
            disabled={disabled}
            placeholder="—"
            onChange={(event) =>
              onChange({ ...stage, staleAfterDays: Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber })
            }
            className="h-8 w-16 text-xs"
          />
          <span className="text-muted-foreground">dias</span>
        </label>
      )}
    </div>
  </div>
);

export const DialogSavePipeline: FC<DialogSavePipelineProps> = ({ clientId, pipeline }) => {
  const { access } = useClientContext();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [stages, setStages] = useState<StageDraft[]>([]);
  const isEditing = !!pipeline;

  const queryClient = useQueryClient();

  const flowsQuery = useQuery({
    queryKey: ["flows", clientId],
    queryFn: () => flowService.findAll({ params: { clientId } }),
    enabled: isOpen,
  });
  const flows = flowsQuery.data ?? [];

  const fieldsQuery = useQuery({
    queryKey: ["crm", "fields", clientId],
    queryFn: () => crmService.findAllCrmFields({ params: { clientId } }),
    enabled: isOpen,
  });
  const fields = (fieldsQuery.data ?? []).filter((field) => field.active);

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["crm", "pipelines", clientId] });
    toast.success(isEditing ? "Funil atualizado com sucesso" : "Funil criado com sucesso");
    setIsOpen(false);
  };

  const createPipeline = useMutation({ mutationFn: crmService.createPipeline, onError: requestErrorHandling, onSuccess });
  const updatePipeline = useMutation({ mutationFn: crmService.updatePipeline, onError: requestErrorHandling, onSuccess });
  const isPending = createPipeline.isPending || updatePipeline.isPending;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(pipeline?.name ?? "");
      setStages(pipeline ? pipeline.stages.map((stage) => ({ key: stage.id, ...stage })) : buildDefaultStages());
    }

    setIsOpen(open);
  };

  const openStages = stages.filter((stage) => stage.type === "OPEN");
  const finalStages = stages.filter((stage) => stage.type !== "OPEN");
  const isStaleValid = (stage: StageDraft) => stage.staleAfterDays == null || (stage.staleAfterDays >= 1 && stage.staleAfterDays <= 365);
  const isValid = name.trim() !== "" && openStages.length > 0 && stages.every((stage) => stage.name.trim() !== "" && isStaleValid(stage));

  const updateStage = (updated: StageDraft) => setStages((items) => items.map((item) => (item.key === updated.key ? updated : item)));

  const moveOpenStage = (index: number, direction: -1 | 1) => {
    const reordered = [...openStages];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    setStages([...reordered, ...finalStages]);
  };

  const addStage = () =>
    setStages([
      ...openStages,
      { key: newKey(), name: "", color: stageColorOptions[openStages.length % stageColorOptions.length], type: "OPEN" },
      ...finalStages,
    ]);

  const handleSubmit = () => {
    if (!isValid) return;

    const body: SavePipelineRequestBody = {
      name: name.trim(),
      stages: stages.map(({ id, name: stageName, color, type, entryFlowId, staleAfterDays, requiredFieldIds, conversionEvent }) => ({
        id,
        name: stageName.trim(),
        color,
        type,
        entryFlowId: entryFlowId ?? null,
        staleAfterDays: type === "OPEN" ? (staleAfterDays ?? null) : null,
        // Só campos ativos; um campo desativado depois deixa de ser exigido
        requiredFieldIds: (requiredFieldIds ?? []).filter((fieldId) => fields.some((field) => field.id === fieldId)),
        conversionEvent: conversionEvent ?? null,
      })),
    };

    if (pipeline) {
      updatePipeline.mutate({ params: { clientId, pipelineId: pipeline.id }, body });
      return;
    }

    createPipeline.mutate({ params: { clientId }, body });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-8 w-8 shrink-0"
            aria-label={`Editar ${pipeline?.name ?? "funil"}`}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>Novo funil</Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar funil" : "Novo funil"}</DialogTitle>
          <DialogDescription>
            As etapas aparecem como colunas do quadro, na ordem abaixo. Ganho e Perdido encerram o negócio e ficam sempre no fim. O fluxo da
            etapa roda quando alguém move um negócio para ela, desde que o contato tenha escrito nas últimas 24h.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pipeline-name">Nome</Label>
            <Input
              id="pipeline-name"
              value={name}
              maxLength={80}
              disabled={isPending}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Vendas"
            />
          </div>

          <div className="grid gap-2">
            <Label>Etapas</Label>
            {openStages.map((stage, index) => (
              <StageRow
                key={stage.key}
                stage={stage}
                flows={flows}
                fields={fields}
                onChange={updateStage}
                disabled={isPending}
                showConversionEvent={access.adsEnabled}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="Subir etapa"
                  disabled={index === 0 || isPending}
                  onClick={() => moveOpenStage(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="Descer etapa"
                  disabled={index === openStages.length - 1 || isPending}
                  onClick={() => moveOpenStage(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground h-8 w-8 shrink-0"
                  aria-label="Remover etapa"
                  disabled={openStages.length === 1 || isPending}
                  onClick={() => setStages((items) => items.filter((item) => item.key !== stage.key))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </StageRow>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={addStage}
              disabled={stages.length >= MAX_STAGES || isPending}
            >
              <Plus className="h-4 w-4" />
              Adicionar etapa
            </Button>
            {isEditing && (
              <p className="text-muted-foreground text-xs">Uma etapa só pode ser removida depois que os negócios dela forem movidos.</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Etapas finais</Label>
            {finalStages.map((stage) => (
              <StageRow
                key={stage.key}
                stage={stage}
                flows={flows}
                fields={fields}
                onChange={updateStage}
                disabled={isPending}
                showConversionEvent={access.adsEnabled}
              >
                <span className="text-muted-foreground w-16 shrink-0 text-xs">{stage.type === "WON" ? "Ganho" : "Perdido"}</span>
              </StageRow>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!isValid || isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
