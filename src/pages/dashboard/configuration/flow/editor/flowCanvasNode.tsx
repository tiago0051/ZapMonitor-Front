import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { useFlowIssuesContext } from "./flowEditorContext";
import { FLOW_ENTRY_NODE_TYPES, flowNodeConfigs, getFlowNodeOutputs } from "./flowNodeConfig";
import { useNodeSummary } from "./useNodeSummary";

export type FlowCanvasNodeType = Node<FlowNodeData, FlowNodeType>;

const handleClassName = "!h-3 !w-3 !border-2 !border-background !bg-muted-foreground";

export const FlowCanvasNode = memo(({ id, type, data, selected }: NodeProps<FlowCanvasNodeType>) => {
  const config = flowNodeConfigs[type];
  const Icon = config.icon;
  const outputs = getFlowNodeOutputs(type, data);
  const summary = useNodeSummary(type, data);
  const issueCount = useFlowIssuesContext().get(id) ?? 0;

  return (
    <div
      className={cn(
        "bg-card text-card-foreground w-60 rounded-xl border-2 shadow-sm transition-shadow",
        config.colorClassName,
        selected && "ring-ring/60 shadow-md ring-2",
        issueCount > 0 && !selected && "ring-2 ring-amber-400/70",
      )}
    >
      {!FLOW_ENTRY_NODE_TYPES.includes(type as FlowNodeType) && (
        <Handle type="target" position={Position.Left} className={handleClassName} />
      )}

      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-foreground truncate text-sm font-semibold">{config.label}</span>
        {issueCount > 0 && (
          <span
            title={`${issueCount} pendência(s)`}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            <AlertTriangle className="h-3 w-3" />
            {issueCount}
          </span>
        )}
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
