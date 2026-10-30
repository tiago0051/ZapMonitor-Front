import { cn } from "@/lib/utils";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { useFlowEditorContext } from "./flowEditorContext";
import { flowNodeConfigs, getFlowNodeOutputs, WEEKDAY_LABELS } from "./flowNodeConfig";

export type FlowCanvasNodeType = Node<FlowNodeData, FlowNodeType>;

const handleClassName = "!h-3 !w-3 !border-2 !border-background !bg-muted-foreground";

function useNodeSummary(type: FlowNodeType, data: FlowNodeData) {
  const { serviceGroups, aiAgents } = useFlowEditorContext();

  switch (type) {
    case "start":
      return "Quando um novo atendimento começa";
    case "message":
    case "end":
      return data.text?.trim() || (type === "end" ? "Finaliza sem mensagem" : "Mensagem não preenchida");
    case "condition":
      return data.question?.trim() || "Pergunta não preenchida";
    case "aiAgent":
      return aiAgents.find((agent) => agent.id === data.aiAgentId)?.name ?? "Selecione um agente";
    case "serviceGroup":
      return serviceGroups.find((group) => group.id === data.serviceGroupId)?.name ?? "Selecione um grupo";
    case "businessHours": {
      const weekdays = [...new Set((data.intervals ?? []).map((interval) => interval.weekday))].sort();
      return weekdays.length ? weekdays.map((weekday) => WEEKDAY_LABELS[weekday].slice(0, 3)).join(", ") : "Sem horários";
    }
  }
}

export const FlowCanvasNode = memo(({ type, data, selected }: NodeProps<FlowCanvasNodeType>) => {
  const config = flowNodeConfigs[type];
  const Icon = config.icon;
  const outputs = getFlowNodeOutputs(type, data);
  const summary = useNodeSummary(type, data);

  return (
    <div
      className={cn(
        "bg-card text-card-foreground w-60 rounded-xl border-2 shadow-sm transition-shadow",
        config.colorClassName,
        selected && "ring-ring/60 shadow-md ring-2",
      )}
    >
      {type !== "start" && <Handle type="target" position={Position.Left} className={handleClassName} />}

      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-foreground truncate text-sm font-semibold">{config.label}</span>
      </div>

      <p className="text-muted-foreground line-clamp-3 px-3 py-2 text-xs whitespace-pre-wrap">{summary}</p>

      {outputs.length > 0 && (
        <div className="border-t py-1">
          {outputs.map((output) => (
            <div key={output.id} className="relative py-1 pr-4 pl-3 text-right">
              <span className="text-foreground text-xs">{output.label}</span>
              <Handle type="source" id={output.id} position={Position.Right} className={handleClassName} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

FlowCanvasNode.displayName = "FlowCanvasNode";
