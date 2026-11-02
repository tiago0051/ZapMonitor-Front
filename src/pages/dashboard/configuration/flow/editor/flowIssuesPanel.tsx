import { AlertTriangle, ChevronDown, ChevronRight, Workflow } from "lucide-react";
import type { FC } from "react";
import type { FlowCanvasNodeType } from "./flowCanvasNode";
import { flowNodeConfigs } from "./flowNodeConfig";
import { useNodeSummary } from "./useNodeSummary";

type FlowIssuesPanelProps = {
  title: string;
  issues: FlowIssue[];
  nodes: FlowCanvasNodeType[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectNode: (nodeId: string) => void;
};

const IssueMessages: FC<{ messages: string[] }> = ({ messages }) => (
  <ul className="list-disc space-y-0.5 pl-5">
    {messages.map((message, index) => (
      <li key={`${index}-${message}`} className="first-letter:uppercase">
        {message}
      </li>
    ))}
  </ul>
);

const NodeIssues: FC<{ node: FlowCanvasNodeType; messages: string[]; onSelect: () => void }> = ({ node, messages, onSelect }) => {
  const config = flowNodeConfigs[node.type as FlowNodeType];
  const Icon = config.icon;
  const summary = useNodeSummary(node.type as FlowNodeType, node.data);

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-2.5">
      <button
        type="button"
        onClick={onSelect}
        title="Mostrar no fluxo"
        className="hover:text-foreground mb-1.5 flex w-full min-w-0 items-center gap-2 text-left"
      >
        <Icon className={`h-4 w-4 shrink-0 ${config.colorClassName}`} />
        <span className="shrink-0 font-semibold">{config.label}</span>
        <span className="text-muted-foreground truncate text-xs">{summary}</span>
        <ChevronRight className="text-muted-foreground ml-auto h-4 w-4 shrink-0" />
      </button>
      <IssueMessages messages={messages} />
    </div>
  );
};

/** Lista as pendências agrupadas por nó; clicar no nó leva até ele no canvas. */
export const FlowIssuesPanel: FC<FlowIssuesPanelProps> = ({ title, issues, nodes, isOpen, onOpenChange, onSelectNode }) => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  // Pendências de nós que já saíram do canvas também valem para o fluxo todo
  const flowMessages = issues.filter((issue) => !issue.nodeId || !nodesById.has(issue.nodeId)).map((issue) => issue.message);
  const nodeGroups = nodes
    .map((node) => ({ node, messages: issues.filter((issue) => issue.nodeId === node.id).map((issue) => issue.message) }))
    .filter((group) => group.messages.length > 0);

  return (
    <div className="border-b bg-amber-50 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 px-4 py-2 text-left font-medium"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="grid max-h-64 gap-2 overflow-y-auto px-4 pb-3 md:grid-cols-2 xl:grid-cols-3">
          {flowMessages.length > 0 && (
            <div className="bg-card text-card-foreground rounded-lg border p-2.5">
              <p className="mb-1.5 flex items-center gap-2 font-semibold">
                <Workflow className="text-muted-foreground h-4 w-4 shrink-0" />
                Fluxo
              </p>
              <IssueMessages messages={flowMessages} />
            </div>
          )}
          {nodeGroups.map((group) => (
            <NodeIssues key={group.node.id} node={group.node} messages={group.messages} onSelect={() => onSelectNode(group.node.id)} />
          ))}
        </div>
      )}
    </div>
  );
};
