import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { crmSelectClassName } from "../crmUtils";
import { useCrmOptions } from "../useCrmOptions";
import { useDealActions } from "../useDealActions";

// Para quem é o negócio: a conversa do WhatsApp ou a ficha do contato
export type NewDealTarget = { whatsappContactId: string } | { contactId: string };

type NewDealFormProps = {
  target: NewDealTarget;
  // Funis em que dá para criar: ativos e, salvo quando o funil permite, sem negócio aberto do contato
  pipelines: Pipeline[];
  defaultPipelineId?: string;
  defaultTitle?: string;
  defaultServiceGroupId?: string;
  onCreated?: (deal: Deal) => void;
  onCancel?: () => void;
  idPrefix?: string;
};

/** Formulário do negócio novo: funil, etapa, título, valor e grupo. Sem título, o servidor usa o nome do contato. */
export const NewDealForm: FC<NewDealFormProps> = ({
  target,
  pipelines,
  defaultPipelineId,
  defaultTitle = "",
  defaultServiceGroupId = "",
  onCreated,
  onCancel,
  idPrefix = "new-deal",
}) => {
  const { client } = useClientContext();
  const { canViewAll, visibleServiceGroups } = useCrmOptions();
  const actions = useDealActions();
  const queryClient = useQueryClient();

  const [pipelineId, setPipelineId] = useState(
    pipelines.find((pipeline) => pipeline.id === defaultPipelineId)?.id ?? pipelines[0]?.id ?? "",
  );
  const pipeline = pipelines.find((item) => item.id === pipelineId);
  const openStages = pipeline?.stages.filter((stage) => stage.type === "OPEN") ?? [];
  const [stageId, setStageId] = useState("");
  // Etapa escolhida que não é do funil atual volta para a primeira aberta
  const selectedStageId = openStages.some((stage) => stage.id === stageId) ? stageId : (openStages[0]?.id ?? "");
  const [title, setTitle] = useState(defaultTitle);
  const [value, setValue] = useState("");
  const [serviceGroupId, setServiceGroupId] = useState(defaultServiceGroupId);

  const parsedValue = value.trim() === "" ? null : Number(value.replace(",", "."));
  const isValueInvalid = parsedValue !== null && (Number.isNaN(parsedValue) || parsedValue < 0);
  const isValid = !!pipelineId && !!selectedStageId && !isValueInvalid && (canViewAll || !!serviceGroupId);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    actions.createDeal.mutate(
      {
        params: { clientId: client.id },
        body: {
          ...target,
          pipelineId,
          stageId: selectedStageId,
          serviceGroupId: serviceGroupId || null,
          ...(title.trim() && { title: title.trim() }),
          value: parsedValue,
        },
      },
      {
        onSuccess: (deal) => {
          // A ficha do contato mostra os negócios dele
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
          toast.success("Negócio criado");
          onCreated?.(deal);
        },
      },
    );
  };

  if (pipelines.length === 0)
    return (
      <p className="text-muted-foreground text-xs">
        Este contato já tem um negócio aberto em todos os funis. Para permitir recompra, ligue "Permitir mais de um negócio aberto por
        contato" na configuração do funil.
      </p>
    );

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 rounded-lg border border-dashed p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-pipeline`} className="text-xs">
            Funil
          </Label>
          <select
            id={`${idPrefix}-pipeline`}
            value={pipelineId}
            onChange={(event) => setPipelineId(event.target.value)}
            className={crmSelectClassName}
          >
            {pipelines.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-stage`} className="text-xs">
            Etapa
          </Label>
          <select
            id={`${idPrefix}-stage`}
            value={selectedStageId}
            onChange={(event) => setStageId(event.target.value)}
            className={crmSelectClassName}
          >
            {openStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-title`} className="text-xs">
          Título
        </Label>
        <Input
          id={`${idPrefix}-title`}
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Sem título, vale o nome do contato"
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-value`} className="text-xs">
            Valor (R$)
          </Label>
          <Input
            id={`${idPrefix}-value`}
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0,00"
            aria-invalid={isValueInvalid}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-group`} className="text-xs">
            Grupo de atendimento
          </Label>
          <select
            id={`${idPrefix}-group`}
            value={serviceGroupId}
            onChange={(event) => setServiceGroupId(event.target.value)}
            className={crmSelectClassName}
          >
            {canViewAll ? <option value="">Sem grupo</option> : !serviceGroupId && <option value="">Escolha um grupo</option>}
            {visibleServiceGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!isValid || actions.isPending}>
          Criar negócio
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
};
