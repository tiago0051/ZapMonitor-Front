import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { stageColorOptions } from "@/pages/dashboard/crm/crmUtils";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

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
  { key: newKey(), name: "Ganho", color: "#22c55e", type: "WON" },
  { key: newKey(), name: "Perdido", color: "#ef4444", type: "LOST" },
];

const StageRow: FC<{ stage: StageDraft; onChange: (stage: StageDraft) => void; disabled: boolean; children?: React.ReactNode }> = ({
  stage,
  onChange,
  disabled,
  children,
}) => (
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
);

export const DialogSavePipeline: FC<DialogSavePipelineProps> = ({ clientId, pipeline }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [stages, setStages] = useState<StageDraft[]>([]);
  const isEditing = !!pipeline;

  const queryClient = useQueryClient();

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
  const isValid = name.trim() !== "" && openStages.length > 0 && stages.every((stage) => stage.name.trim() !== "");

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
      stages: stages.map(({ id, name: stageName, color, type }) => ({ id, name: stageName.trim(), color, type })),
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
          <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 shrink-0">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>Novo funil</Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar funil" : "Novo funil"}</DialogTitle>
          <DialogDescription>
            As etapas aparecem como colunas do quadro, na ordem abaixo. Ganho e Perdido encerram o negócio e ficam sempre no fim.
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
              <StageRow key={stage.key} stage={stage} onChange={updateStage} disabled={isPending}>
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
              <StageRow key={stage.key} stage={stage} onChange={updateStage} disabled={isPending}>
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
