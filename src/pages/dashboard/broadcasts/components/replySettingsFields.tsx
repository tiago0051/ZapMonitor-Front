import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { flowService } from "@/services/api/flowService";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { selectClassName } from "../audienceSources";

type ReplySettingsFieldsProps = {
  value: BroadcastReply;
  onChange: (value: BroadcastReply) => void;
  disabled?: boolean;
};

/** Fluxo que atende quem responde e negócio criado no funil, como a rota de um anúncio. */
export const ReplySettingsFields: FC<ReplySettingsFieldsProps> = ({ value, onChange, disabled }) => {
  const { client, canUseCrm } = useClientContext();

  // Sem permissão de fluxos a lista volta vazia e vale o fluxo do número
  const flowsQuery = useQuery({
    queryKey: ["flows", client.id, "broadcast"],
    queryFn: () => flowService.findAll({ params: { clientId: client.id } }),
    retry: false,
    meta: { errorHandledInline: true },
  });
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: canUseCrm,
  });
  const groupsQuery = useQuery({
    queryKey: ["serviceGroups", client.id, "broadcast"],
    queryFn: () => serviceGroupService.findAll({ params: { clientId: client.id } }),
    enabled: canUseCrm && !!value.pipelineId,
    retry: false,
    meta: { errorHandledInline: true },
  });

  const flows = (flowsQuery.data ?? []).filter((flow) => flow.active && flow.kind !== "QUEUE");
  const pipelines = (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active);
  const pipeline = pipelines.find((item) => item.id === value.pipelineId);
  const stages = (pipeline?.stages ?? []).filter((stage) => stage.type === "OPEN");

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="broadcast-reply-flow" className="text-xs">
          Fluxo que atende quem responder
        </Label>
        <select
          id="broadcast-reply-flow"
          className={selectClassName}
          value={value.flowId ?? ""}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, flowId: event.target.value || null })}
        >
          <option value="">O fluxo do número</option>
          {flows.map((flow) => (
            <option key={flow.id} value={flow.id}>
              {flow.name}
            </option>
          ))}
        </select>
      </div>

      {canUseCrm && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="broadcast-reply-pipeline" className="text-xs">
              Criar negócio no funil
            </Label>
            <select
              id="broadcast-reply-pipeline"
              className={selectClassName}
              value={value.pipelineId ?? ""}
              disabled={disabled}
              onChange={(event) => onChange({ ...value, pipelineId: event.target.value || null, stageId: null })}
            >
              <option value="">Não criar negócio</option>
              {pipelines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          {pipeline && (
            <div className="grid gap-1.5">
              <Label htmlFor="broadcast-reply-stage" className="text-xs">
                Etapa
              </Label>
              <select
                id="broadcast-reply-stage"
                className={selectClassName}
                value={value.stageId ?? ""}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, stageId: event.target.value || null })}
              >
                <option value="">A primeira etapa aberta</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {pipeline && (
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="broadcast-reply-group" className="text-xs">
                Grupo de atendimento do negócio
              </Label>
              <select
                id="broadcast-reply-group"
                className={selectClassName}
                value={value.serviceGroupId ?? ""}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, serviceGroupId: event.target.value || null })}
              >
                <option value="">O grupo do contato</option>
                {(groupsQuery.data ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      <p className="text-muted-foreground text-xs">Vale para a primeira resposta de cada pessoa até 7 dias depois do envio.</p>
    </div>
  );
};
