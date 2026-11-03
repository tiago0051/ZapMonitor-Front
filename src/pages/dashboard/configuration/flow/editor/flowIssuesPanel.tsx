import { AlertTriangle, ChevronRight, Minus, Workflow } from "lucide-react";
import type { FC } from "react";
import type { FlowCanvasNodeType } from "./flowCanvasNode";
import { flowNodeConfigs } from "./flowNodeConfig";
import { useNodeSummary } from "./useNodeSummary";

type FlowIssuesPanelProps = {
  title: string;
  description: string;
  issues: FlowIssue[];
  nodes: FlowCanvasNodeType[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectNode: (nodeId: string) => void;
};

const IssueMessages: FC<{ messages: string[] }> = ({ messages }) => (
  <ul className="space-y-1 pl-6">
    {messages.map((message, index) => (
      <li key={`${index}-${message}`} className="relative text-sm leading-snug first-letter:uppercase">
        <span aria-hidden className="absolute top-[0.45em] -left-3 h-1.5 w-1.5 rounded-full bg-amber-500" />
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
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="hover:bg-muted group flex w-full flex-col gap-1.5 rounded-lg px-3 py-2.5 text-left transition-colors"
      >
        <span className="flex w-full min-w-0 items-center gap-2">
          <Icon className={`h-4 w-4 shrink-0 ${config.colorClassName}`} />
          <span className="shrink-0 text-sm font-semibold">{config.label}</span>
          <span className="text-muted-foreground min-w-0 truncate text-xs">{summary}</span>
          <span className="text-muted-foreground group-hover:text-foreground ml-auto flex shrink-0 items-center gap-0.5 text-xs">
            Ver no fluxo
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </span>
        <IssueMessages messages={messages} />
      </button>
    </li>
  );
};

/** Lista flutuante sobre o canvas com as pendências agrupadas por nó; clicar em um nó leva até ele. */
export const FlowIssuesPanel: FC<FlowIssuesPanelProps> = ({ title, description, issues, nodes, isOpen, onOpenChange, onSelectNode }) => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  // Pendências de nós que já saíram do canvas também valem para o fluxo todo
  const flowMessages = issues.filter((issue) => !issue.nodeId || !nodesById.has(issue.nodeId)).map((issue) => issue.message);
  const nodeGroups = nodes
    .map((node) => ({ node, messages: issues.filter((issue) => issue.nodeId === node.id).map((issue) => issue.message) }))
    .filter((group) => group.messages.length > 0);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 shadow-md transition-colors hover:bg-amber-100"
      >
        <AlertTriangle className="h-4 w-4" />
        {issues.length} pendência(s)
        <span className="text-amber-700">· Mostrar</span>
      </button>
    );
  }

  return (
    <section
      aria-label="Pendências do fluxo"
      className="bg-card text-card-foreground absolute top-3 left-3 z-10 flex max-h-[calc(100%-1.5rem)] w-[min(28rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border border-amber-300 shadow-lg"
    >
      <header className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-amber-800">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Minimizar pendências"
          title="Minimizar"
          className="-mt-0.5 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-amber-800 transition-colors hover:bg-amber-100"
        >
          <Minus className="h-4 w-4" />
        </button>
      </header>

      <ul className="divide-y overflow-y-auto p-1.5">
        {flowMessages.length > 0 && (
          <li className="flex flex-col gap-1.5 px-3 py-2.5">
            <span className="flex items-center gap-2">
              <Workflow className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold">Fluxo</span>
            </span>
            <IssueMessages messages={flowMessages} />
          </li>
        )}
        {nodeGroups.map((group) => (
          <NodeIssues key={group.node.id} node={group.node} messages={group.messages} onSelect={() => onSelectNode(group.node.id)} />
        ))}
      </ul>
    </section>
  );
};
